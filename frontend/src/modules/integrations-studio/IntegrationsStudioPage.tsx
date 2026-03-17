import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { IntegrationConfig, TestConnectionResult } from '../../api/integrations'
import { testConnection } from '../../api/integrations'
import { useEnvironments, useIntegrations, useSaveEnvironment } from '../admin-integrations/useIntegrationsEnvApi'
import { EmptyState, LoadingMessage } from '../ui/feedback'
import { IntegrationWizard } from '../admin-integrations/IntegrationWizard'
import { SkeletonGrid } from '../ui/Skeleton'
import { useToast } from '../ui/ToastContext'
import { ConnectorCatalog } from './ConnectorCatalog'
import { ConnectorConfigDrawer } from './ConnectorConfigDrawer'
import type { ConnectorDef } from './connectorRegistry'
import { fetchStackValidation, fetchConnectorPacks } from '../../api/analytics'
import './integrations-studio.css'

const CATEGORY_LABELS: Record<string, string> = {
  llm_provider: 'LLM provider',
  embedding_provider: 'Embedding provider',
  reranker: 'Reranker',
  vector_db: 'Vector DB',
  graph_db: 'Graph DB',
  sql_db: 'SQL DB',
  file_storage: 'File storage',
  document_repository: 'Document repository',
  identity_provider: 'Identity provider',
  logging_monitoring: 'Logging / monitoring',
  email: 'Email',
  enterprise_app: 'Enterprise app',
  api: 'API',
}

export function IntegrationsStudioPage() {
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const integrationsQuery = useIntegrations()
  const environmentsQuery = useEnvironments()
  const integrations = integrationsQuery.data ?? []
  const environments = environmentsQuery.data ?? []
  const saveEnvironment = useSaveEnvironment()
  const [activeTab, setActiveTab] = useState<'catalog' | 'list' | 'matrix' | 'validation' | 'packs'>('catalog')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editing, setEditing] = useState<IntegrationConfig | null>(null)
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null)
  const [selectedConnector, setSelectedConnector] = useState<ConnectorDef | null>(null)
  const [valArch, setValArch] = useState('hybrid')

  // WS-3 stack validation + connector packs
  const stackValQ = useQuery({ queryKey: ['stack-validation', valArch], queryFn: () => fetchStackValidation(valArch), enabled: activeTab === 'validation' })
  const packsQ = useQuery({ queryKey: ['connector-packs'], queryFn: fetchConnectorPacks, enabled: activeTab === 'packs' })

  const testMutation = useMutation({
    mutationFn: (id: string) => testConnection(id),
    onSuccess: (result) => {
      setTestResult(result)
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      if (result.status === 'healthy') success(`Connected — ${result.latency_ms} ms`)
      else error(`Degraded — ${result.message}`)
    },
    onError: () => error('Test connection failed'),
  })

  const filteredIntegrations = useMemo(() => {
    if (!categoryFilter) return integrations
    return integrations.filter((i) => i.provider_type === categoryFilter)
  }, [integrations, categoryFilter])

  const categories = useMemo(() => {
    const set = new Set(integrations.map((i) => i.provider_type))
    return Array.from(set).sort()
  }, [integrations])


  return (
    <div className="int-studio-root">
      <header className="int-studio-header">
        <div>
          <h1>Integrations Studio</h1>
          <p>Configure and manage LLM, embedding, vector DB, and other providers. Bind them to environments for deployment.</p>
        </div>
        <div className="int-studio-header-actions">
          <button type="button" className="int-studio-btn int-studio-btn--primary" onClick={() => { setEditing(null); setWizardOpen(true) }}>
            New integration
          </button>
        </div>
      </header>

      <div className="int-studio-tabs">
        <button
          type="button"
          className={activeTab === 'catalog' ? 'int-studio-tab int-studio-tab--active' : 'int-studio-tab'}
          onClick={() => setActiveTab('catalog')}
        >
          Catalog
        </button>
        <button
          type="button"
          className={activeTab === 'list' ? 'int-studio-tab int-studio-tab--active' : 'int-studio-tab'}
          onClick={() => setActiveTab('list')}
        >
          Active
        </button>
        <button type="button" className={activeTab === 'matrix' ? 'int-studio-tab int-studio-tab--active' : 'int-studio-tab'} onClick={() => setActiveTab('matrix')}>
          Binding matrix
        </button>
        <button type="button" className={activeTab === 'validation' ? 'int-studio-tab int-studio-tab--active' : 'int-studio-tab'} onClick={() => setActiveTab('validation')}>
          🔍 Stack Validation
        </button>
        <button type="button" className={activeTab === 'packs' ? 'int-studio-tab int-studio-tab--active' : 'int-studio-tab'} onClick={() => setActiveTab('packs')}>
          📦 Connector Packs
        </button>
      </div>

      {activeTab === 'catalog' && (
        <ConnectorCatalog
          integrations={integrations}
          onSelect={(c) => setSelectedConnector(c)}
        />
      )}

      {activeTab === 'list' && (
        <div className="int-studio-list-layout">
          <div className="int-studio-list-main">
            <div className="int-studio-filters">
              <label className="int-studio-filter">
                <span>Category</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter by category"
                >
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c] ?? c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {integrationsQuery.isLoading ? (
              <SkeletonGrid count={6} />
            ) : filteredIntegrations.length === 0 ? (
              <EmptyState
                title="No integrations"
                description="Create an integration to connect LLMs, vector stores, and other backends."
              />
            ) : (
              <ul className="int-studio-cards">
                {filteredIntegrations.map((integration) => (
                  <li
                    key={integration.id}
                    className={`int-studio-card ${selectedIntegration?.id === integration.id ? 'int-studio-card--selected' : ''}`}
                    onClick={() => { setSelectedIntegration(integration); setTestResult(null) }}
                  >
                    <div className="int-studio-card-header">
                      <div className="int-studio-card-badge">{CATEGORY_LABELS[integration.provider_type] ?? integration.provider_type}</div>
                      <span className={`int-studio-health-dot int-studio-health-dot--${integration.health_status ?? 'unknown'}`} title={integration.health_status ?? 'Unknown'} />
                    </div>
                    <h3 className="int-studio-card-title">{integration.name}</h3>
                    <p className="int-studio-card-id">{integration.id}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <aside className="int-studio-detail">
            {selectedIntegration ? (
              <>
                <h2>{selectedIntegration.name}</h2>
                <div className="int-studio-detail-meta">
                  <span className="int-studio-detail-badge">{CATEGORY_LABELS[selectedIntegration.provider_type] ?? selectedIntegration.provider_type}</span>
                  <span className={`int-studio-health-dot int-studio-health-dot--${selectedIntegration.health_status ?? 'unknown'}`} />
                  <span style={{ fontSize: '0.82rem', color: selectedIntegration.health_status === 'healthy' ? '#34d399' : selectedIntegration.health_status === 'degraded' ? '#fb923c' : '#64748b' }}>
                    {selectedIntegration.health_status ?? 'Unknown'}
                  </span>
                  {selectedIntegration.reusable && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Reusable</span>}
                </div>
                {testResult && testResult.integration_id === selectedIntegration.id && (
                  <div className={`int-studio-test-result int-studio-test-result--${testResult.status}`}>
                    <strong>{testResult.status === 'healthy' ? '✓ Healthy' : '⚠ Degraded'}</strong>
                    <span>{testResult.message}</span>
                    <span className="int-studio-test-latency">{testResult.latency_ms} ms</span>
                  </div>
                )}
                <section>
                  <h3>Credentials</h3>
                  <p className="int-studio-detail-ref">Reference: {selectedIntegration.credentials_reference || '—'}</p>
                  {selectedIntegration.last_tested_at && (
                    <p className="int-studio-detail-ref" style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Last tested: {new Date(selectedIntegration.last_tested_at).toLocaleString()}
                    </p>
                  )}
                </section>
                <section>
                  <h3>Environment mapping</h3>
                  <ul className="int-studio-detail-envs">
                    {Object.entries(selectedIntegration.environment_mapping ?? {}).map(([envId, ref]) => (
                      <li key={envId}>{envId} → {ref}</li>
                    ))}
                    {Object.keys(selectedIntegration.environment_mapping ?? {}).length === 0 && <li>None</li>}
                  </ul>
                </section>
                <section>
                  <h3>Usage policies</h3>
                  <pre className="int-studio-detail-json">
                    {JSON.stringify(selectedIntegration.default_usage_policies ?? {}, null, 2)}
                  </pre>
                </section>
                <div className="int-studio-detail-actions">
                  <button
                    type="button"
                    className="int-studio-btn int-studio-btn--secondary"
                    onClick={() => { setEditing(selectedIntegration); setWizardOpen(true) }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="int-studio-btn int-studio-btn--secondary"
                    onClick={() => testMutation.mutate(selectedIntegration.id)}
                    disabled={testMutation.isPending}
                  >
                    {testMutation.isPending ? 'Testing…' : 'Test connection'}
                  </button>
                </div>
              </>
            ) : (
              <p className="int-studio-detail-empty">Select an integration to view details and dependencies.</p>
            )}
          </aside>
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="int-studio-matrix-section">
          {environmentsQuery.isLoading ? (
            <LoadingMessage label="Loading environments…" />
          ) : environments.length === 0 || integrations.length === 0 ? (
            <EmptyState
              title="No environments or integrations"
              description="Create environments and integrations to manage bindings."
            />
          ) : (
            <div className="int-studio-matrix-wrap">
              <table className="int-studio-matrix">
                <thead>
                  <tr>
                    <th>Environment</th>
                    {integrations.map((i) => (
                      <th key={i.id}>{i.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {environments.map((env) => (
                    <tr key={env.id}>
                      <td>
                        <strong>{env.name}</strong>
                        <span className="int-studio-matrix-env-id">{env.id}</span>
                      </td>
                      {integrations.map((integration) => {
                        const bound = env.integration_bindings?.[integration.id] ?? ''
                        return (
                          <td key={integration.id}>
                            <select
                              value={bound}
                              onChange={(e) => {
                                const val = e.target.value
                                saveEnvironment.mutate(
                                  {
                                    ...env,
                                    integration_bindings: {
                                      ...(env.integration_bindings ?? {}),
                                      [integration.id]: val,
                                    },
                                  },
                                  {
                                    onSuccess: () => success('Binding updated'),
                                    onError: () => error('Failed to update binding'),
                                  },
                                )
                              }}
                            >
                              <option value="">Unbound</option>
                              <option value={integration.id}>{integration.id}</option>
                            </select>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stack Validation Tab */}
      {activeTab === 'validation' && (
        <div className="int-studio-matrix-section">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Architecture:</label>
            <select value={valArch} onChange={e => setValArch(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)', fontSize: '0.82rem' }}>
              {['hybrid', 'vector', 'vectorless', 'graph', 'temporal', 'agentic', 'self_rag', 'hyde', 'multimodal', 'federated'].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          {stackValQ.isLoading ? <LoadingMessage label="Checking stack readiness…" /> : stackValQ.data ? (
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{(stackValQ.data as Record<string, unknown>).overall_ready ? '✅' : '⚠️'}</span>
                <strong style={{ fontSize: '0.92rem', color: 'var(--color-text)' }}>
                  {(stackValQ.data as Record<string, unknown>).overall_ready ? 'Stack is deployment-ready' : 'Missing required integrations'}
                </strong>
              </div>
              <table className="int-studio-matrix">
                <thead>
                  <tr><th>Environment</th><th>Ready</th><th>Missing</th></tr>
                </thead>
                <tbody>
                  {Object.entries((stackValQ.data as Record<string, unknown>).environments as Record<string, Record<string, unknown>> ?? {}).map(([env, info]) => (
                    <tr key={env}>
                      <td><strong>{String(info.label ?? env)}</strong></td>
                      <td>{info.ready ? <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Ready</span> : <span style={{ color: '#f59e0b', fontWeight: 700 }}>✗ Not Ready</span>}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {Array.isArray(info.missing) && (info.missing as string[]).length > 0 ? (info.missing as string[]).join(', ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No validation data" description="Select an architecture to check stack readiness." />}
        </div>
      )}

      {/* Connector Packs Tab */}
      {activeTab === 'packs' && (
        <div className="int-studio-matrix-section">
          {packsQ.isLoading ? <LoadingMessage label="Loading connector packs…" /> : packsQ.data?.packs ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {Object.entries(packsQ.data.packs).map(([archKey, pack]) => {
                const p = pack as Record<string, unknown>
                return (
                  <div key={archKey} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.25rem' }}>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 0.5rem', textTransform: 'capitalize' }}>{archKey.replace(/_/g, ' ')}</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem' }}>{String(p.description ?? '')}</p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)' }}>
                      <strong>Required:</strong> {Array.isArray(p.required) ? (p.required as string[]).join(', ') : '—'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', marginTop: '0.25rem' }}>
                      <strong>Optional:</strong> {Array.isArray(p.optional) ? (p.optional as string[]).join(', ') : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <EmptyState title="No connector packs" description="Packs will appear once the API is configured." />}
        </div>
      )}

      {wizardOpen && (
        <IntegrationWizard
          initial={editing}
          onClose={() => {
            setEditing(null)
            setWizardOpen(false)
            if (editing?.id === selectedIntegration?.id) setSelectedIntegration(null)
          }}
        />
      )}

      {selectedConnector && (
        <ConnectorConfigDrawer
          connector={selectedConnector}
          onClose={() => setSelectedConnector(null)}
        />
      )}
    </div>
  )
}
