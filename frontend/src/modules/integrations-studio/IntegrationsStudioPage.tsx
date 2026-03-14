import { useState, useMemo } from 'react'
import type { IntegrationConfig } from '../../api/integrations'
import { useEnvironments, useIntegrations, useSaveEnvironment } from '../admin-integrations/useIntegrationsEnvApi'
import { EmptyState, LoadingMessage } from '../ui/feedback'
import { IntegrationWizard } from '../admin-integrations/IntegrationWizard'
import { SkeletonGrid } from '../ui/Skeleton'
import { useToast } from '../ui/ToastContext'
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
  const integrationsQuery = useIntegrations()
  const environmentsQuery = useEnvironments()
  const integrations = integrationsQuery.data ?? []
  const environments = environmentsQuery.data ?? []
  const saveEnvironment = useSaveEnvironment()
  const [activeTab, setActiveTab] = useState<'list' | 'matrix'>('list')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editing, setEditing] = useState<IntegrationConfig | null>(null)
  const [testConnectionPending, setTestConnectionPending] = useState(false)

  const filteredIntegrations = useMemo(() => {
    if (!categoryFilter) return integrations
    return integrations.filter((i) => i.provider_type === categoryFilter)
  }, [integrations, categoryFilter])

  const categories = useMemo(() => {
    const set = new Set(integrations.map((i) => i.provider_type))
    return Array.from(set).sort()
  }, [integrations])

  function handleTestConnection() {
    setTestConnectionPending(true)
    setTimeout(() => setTestConnectionPending(false), 1200)
  }

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
          className={activeTab === 'list' ? 'int-studio-tab int-studio-tab--active' : 'int-studio-tab'}
          onClick={() => setActiveTab('list')}
        >
          List
        </button>
        <button
          type="button"
          className={activeTab === 'matrix' ? 'int-studio-tab int-studio-tab--active' : 'int-studio-tab'}
          onClick={() => setActiveTab('matrix')}
        >
          Binding matrix
        </button>
      </div>

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
                    onClick={() => setSelectedIntegration(integration)}
                  >
                    <div className="int-studio-card-badge">{CATEGORY_LABELS[integration.provider_type] ?? integration.provider_type}</div>
                    <h3 className="int-studio-card-title">{integration.name}</h3>
                    <p className="int-studio-card-id">{integration.id}</p>
                    <span className={`int-studio-card-health ${integration.health_status === 'healthy' ? 'int-studio-card-health--ok' : ''}`}>
                      {integration.health_status ?? 'Unknown'}
                    </span>
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
                  <span>ID: {selectedIntegration.id}</span>
                  {selectedIntegration.reusable && <span>Reusable</span>}
                </div>
                <section>
                  <h3>Credentials</h3>
                  <p className="int-studio-detail-ref">Reference: {selectedIntegration.credentials_reference || '—'}</p>
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
                    onClick={handleTestConnection}
                    disabled={testConnectionPending}
                  >
                    {testConnectionPending ? 'Testing…' : 'Test connection'}
                  </button>
                  <span className="int-studio-simulated">(Simulated — no real connection)</span>
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
    </div>
  )
}
