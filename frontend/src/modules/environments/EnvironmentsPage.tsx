import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { EnvironmentConfig } from '../../api/environments'
import { listEnvironments } from '../../api/environments'
import { listIntegrations } from '../../api/integrations'
import { useSaveEnvironment } from '../admin-integrations/useIntegrationsEnvApi'
import { EmptyState, LoadingMessage } from '../ui/feedback'
import './environments.css'

export function EnvironmentsPage() {
  const environmentsQuery = useQuery({ queryKey: ['environments'], queryFn: listEnvironments })
  const integrationsQuery = useQuery({ queryKey: ['integrations'], queryFn: listIntegrations })
  const saveEnvironment = useSaveEnvironment()
  const environments = environmentsQuery.data ?? []
  const integrations = integrationsQuery.data ?? []
  const [selectedEnv, setSelectedEnv] = useState<EnvironmentConfig | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const id = newName.toLowerCase().replace(/\s+/g, '-')
    saveEnvironment.mutate({
      id,
      name: newName,
      description: newDescription,
      integration_bindings: {},
    })
    setIsCreating(false)
    setNewName('')
    setNewDescription('')
  }

  const boundCount = selectedEnv
    ? Object.keys(selectedEnv.integration_bindings ?? {}).filter((k) => (selectedEnv.integration_bindings ?? {})[k]).length
    : 0
  const readiness = selectedEnv
    ? {
        hasBindings: boundCount > 0,
        approved: selectedEnv.approval_state === 'approved',
        promoted: (selectedEnv.promotion_status ?? 'draft') !== 'draft',
      }
    : null

  return (
    <div className="env-page-root">
      <header className="env-page-header">
        <div>
          <h1>Environments &amp; Deployment</h1>
          <p>
            Manage dev, test, staging, and production. Bind integrations and track promotion and deployment readiness.
          </p>
        </div>
        <button
          type="button"
          className="env-page-btn env-page-btn--primary"
          onClick={() => setIsCreating((v) => !v)}
        >
          {isCreating ? 'Cancel' : 'New environment'}
        </button>
      </header>

      {isCreating && (
        <form onSubmit={handleCreate} className="env-page-create">
          <label>
            <span>Name</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. dev, staging, prod"
            />
          </label>
          <label>
            <span>Description</span>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <button type="submit" disabled={saveEnvironment.isPending || !newName.trim()}>
            {saveEnvironment.isPending ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}

      <div className="env-page-layout">
        <div className="env-page-list">
          {environmentsQuery.isLoading ? (
            <LoadingMessage label="Loading environments…" />
          ) : environments.length === 0 ? (
            <EmptyState
              title="No environments"
              description="Create dev, test, staging, or production to bind integrations and prepare deployment."
            />
          ) : (
            <ul className="env-cards">
              {environments.map((env) => (
                <li
                  key={env.id}
                  className={`env-card ${selectedEnv?.id === env.id ? 'env-card--selected' : ''}`}
                  onClick={() => setSelectedEnv(env)}
                >
                  <span className="env-card-name">{env.name}</span>
                  <span className="env-card-id">{env.id}</span>
                  <span className={`env-card-status env-card-status--${env.promotion_status ?? 'draft'}`}>
                    {env.promotion_status ?? 'draft'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <aside className="env-page-detail">
          {selectedEnv ? (
            <>
              <h2>{selectedEnv.name}</h2>
              <p className="env-detail-id">{selectedEnv.id}</p>
              {selectedEnv.description && <p className="env-detail-desc">{selectedEnv.description}</p>}
              <section className="env-detail-section">
                <h3>Status</h3>
                <ul className="env-detail-status">
                  <li>Promotion: <strong>{selectedEnv.promotion_status ?? 'draft'}</strong></li>
                  <li>Approval: <strong>{selectedEnv.approval_state ?? '—'}</strong></li>
                  <li>Health: <strong>{selectedEnv.health_status ?? '—'}</strong></li>
                </ul>
              </section>
              {selectedEnv.runtime_profile && Object.keys(selectedEnv.runtime_profile).length > 0 && (
                <section className="env-detail-section">
                  <h3>Runtime profile</h3>
                  <ul className="env-detail-kv">
                    {Object.entries(selectedEnv.runtime_profile).map(([k, v]) => (
                      <li key={k}><span>{k}</span> <span>{v}</span></li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="env-detail-section">
                <h3>Readiness checklist</h3>
                <ul className="env-detail-checklist">
                  <li className={readiness?.hasBindings ? 'env-detail-checklist--ok' : ''}>
                    {readiness?.hasBindings ? '✓' : '○'} At least one integration bound
                  </li>
                  <li className={readiness?.approved ? 'env-detail-checklist--ok' : ''}>
                    {readiness?.approved ? '✓' : '○'} Approval (when required)
                  </li>
                  <li className={readiness?.promoted ? 'env-detail-checklist--ok' : ''}>
                    {readiness?.promoted ? '✓' : '○'} Promotion status set
                  </li>
                </ul>
                <p className="env-detail-note">Control plane intent. Full deployment is not yet implemented.</p>
              </section>
              <section className="env-detail-section">
                <h3>Integration bindings</h3>
                {integrationsQuery.isLoading ? (
                  <LoadingMessage label="Loading…" />
                ) : integrations.length === 0 ? (
                  <p className="env-detail-empty">No integrations defined. Add them in Integrations Studio.</p>
                ) : (
                  <ul className="env-detail-bindings">
                    {integrations.map((int) => {
                      const bound = (selectedEnv.integration_bindings ?? {})[int.id] ?? ''
                      return (
                        <li key={int.id}>
                          <label>
                            <span>{int.name}</span>
                            <select
                              value={bound}
                              onChange={(e) =>
                                saveEnvironment.mutate({
                                  ...selectedEnv,
                                  integration_bindings: {
                                    ...(selectedEnv.integration_bindings ?? {}),
                                    [int.id]: e.target.value,
                                  },
                                })
                              }
                            >
                              <option value="">Unbound</option>
                              <option value={int.id}>{int.id}</option>
                            </select>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <p className="env-detail-empty">Select an environment to view details and bindings.</p>
          )}
        </aside>
      </div>
    </div>
  )
}
