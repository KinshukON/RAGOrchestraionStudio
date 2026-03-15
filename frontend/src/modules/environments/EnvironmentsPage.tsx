import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EnvironmentConfig } from '../../api/environments'
import { listEnvironments, promoteEnvironment } from '../../api/environments'
import { listIntegrations } from '../../api/integrations'
import { useSaveEnvironment } from '../admin-integrations/useIntegrationsEnvApi'
import { EmptyState, LoadingMessage } from '../ui/feedback'
import { SkeletonTable } from '../ui/Skeleton'
import { useToast } from '../ui/ToastContext'
import './environments.css'

const PIPELINE_STEPS = ['draft', 'pending', 'promoted'] as const

function pipelineIndex(status: string | undefined): number {
  const idx = PIPELINE_STEPS.indexOf((status ?? 'draft') as typeof PIPELINE_STEPS[number])
  return idx >= 0 ? idx : 0
}

const STEP_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  promoted: 'Promoted',
}

export function EnvironmentsPage() {
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const environmentsQuery = useQuery({ queryKey: ['environments'], queryFn: listEnvironments })
  const integrationsQuery = useQuery({ queryKey: ['integrations'], queryFn: listIntegrations })
  const saveEnvironment = useSaveEnvironment()
  const environments = environmentsQuery.data ?? []
  const integrations = integrationsQuery.data ?? []
  const [selectedEnv, setSelectedEnv] = useState<EnvironmentConfig | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const promoteMutation = useMutation({
    mutationFn: (id: string) => promoteEnvironment(id),
    onSuccess: (updated) => {
      success(`Promoted to "${updated.promotion_status}"`)
      queryClient.invalidateQueries({ queryKey: ['environments'] })
      setSelectedEnv(updated)
    },
    onError: () => error('Promotion failed'),
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const id = newName.toLowerCase().replace(/\s+/g, '-')
    saveEnvironment.mutate(
      { id, name: newName, description: newDescription, integration_bindings: {} },
      {
        onSuccess: () => success(`Environment "${newName}" created`),
        onError: () => error('Failed to create environment'),
      },
    )
    setIsCreating(false)
    setNewName('')
    setNewDescription('')
  }

  const boundCount = selectedEnv
    ? Object.keys(selectedEnv.integration_bindings ?? {}).filter((k) => !!(selectedEnv.integration_bindings ?? {})[k]).length
    : 0
  const readiness = selectedEnv
    ? {
      hasBindings: boundCount > 0,
      approved: selectedEnv.approval_state === 'approved',
      promoted: (selectedEnv.promotion_status ?? 'draft') === 'promoted',
    }
    : null

  const canPromote = selectedEnv && (selectedEnv.promotion_status ?? 'draft') !== 'promoted'

  return (
    <div className="env-page-root">
      <header className="env-page-header">
        <div>
          <h1>Environments &amp; Deployment</h1>
          <p>Manage dev, test, staging, and production. Bind integrations and track promotion readiness.</p>
        </div>
        <button type="button" className="env-page-btn env-page-btn--primary" onClick={() => setIsCreating((v) => !v)}>
          {isCreating ? 'Cancel' : 'New environment'}
        </button>
      </header>

      {isCreating && (
        <form onSubmit={handleCreate} className="env-page-create">
          <label>
            <span>Name</span>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. dev, staging, prod" />
          </label>
          <label>
            <span>Description</span>
            <input type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Optional" />
          </label>
          <button type="submit" disabled={saveEnvironment.isPending || !newName.trim()}>
            {saveEnvironment.isPending ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}

      <div className="env-page-layout">
        <div className="env-page-list">
          {environmentsQuery.isLoading ? (
            <SkeletonTable rows={3} cols={3} />
          ) : environments.length === 0 ? (
            <EmptyState title="No environments" description="Create dev, test, staging, or production to bind integrations and prepare deployment." />
          ) : (
            <ul className="env-cards">
              {environments.map((env) => {
                const step = pipelineIndex(env.promotion_status)
                const bindings = env.integration_bindings ?? {}
                const boundCount = Object.values(bindings).filter(Boolean).length
                const totalInteg = integrations.length
                const readinessPct = totalInteg === 0 ? 0 : Math.round((boundCount / totalInteg) * 100)
                const readinessCls = readinessPct === 100 ? 'env-readiness--ok' : readinessPct > 0 ? 'env-readiness--partial' : 'env-readiness--none'
                return (
                  <li
                    key={env.id}
                    className={`env-card ${selectedEnv?.id === env.id ? 'env-card--selected' : ''}`}
                    onClick={() => setSelectedEnv(env)}
                  >
                    <div className="env-card-top">
                      <span className="env-card-name">{env.name}</span>
                      <span className={`env-card-status env-card-status--${env.promotion_status ?? 'draft'}`}>
                        {env.promotion_status ?? 'draft'}
                      </span>
                    </div>
                    <p className="env-card-id">{env.id}</p>
                    {/* Readiness score pill */}
                    <div className={`env-readiness-row ${readinessCls}`}>
                      <span className="env-readiness-pill">
                        {readinessPct}% ready — {boundCount}/{totalInteg} connectors bound
                      </span>
                      <div className="env-readiness-bar">
                        <div className="env-readiness-fill" style={{ width: `${readinessPct}%` }} />
                      </div>
                    </div>
                    <div className="env-pipeline-bar">
                      {PIPELINE_STEPS.map((s, i) => (
                        <div key={s} className={`env-pipeline-step ${i <= step ? 'env-pipeline-step--done' : ''}`} title={STEP_LABELS[s]}>
                          <span className="env-pipeline-dot" />
                          <span className="env-pipeline-label">{STEP_LABELS[s]}</span>
                        </div>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <aside className="env-page-detail">
          {selectedEnv ? (
            <>
              <h2>{selectedEnv.name}</h2>
              <p className="env-detail-id">{selectedEnv.id}</p>
              {selectedEnv.description && <p className="env-detail-desc">{selectedEnv.description}</p>}

              {/* Detailed pipeline progress bar */}
              <div className="env-pipeline-bar env-pipeline-bar--detail">
                {PIPELINE_STEPS.map((s, i) => {
                  const current = pipelineIndex(selectedEnv.promotion_status)
                  return (
                    <div
                      key={s}
                      className={`env-pipeline-step ${i <= current ? 'env-pipeline-step--done' : ''} ${i === current ? 'env-pipeline-step--current' : ''}`}
                    >
                      <span className="env-pipeline-dot" />
                      <span className="env-pipeline-label">{STEP_LABELS[s]}</span>
                    </div>
                  )
                })}
              </div>

              <div className="env-detail-promote">
                <button
                  type="button"
                  className="env-page-btn env-page-btn--primary"
                  onClick={() => promoteMutation.mutate(selectedEnv.id)}
                  disabled={!canPromote || promoteMutation.isPending}
                >
                  {promoteMutation.isPending ? 'Promoting…' : canPromote ? 'Promote →' : '✓ Promoted'}
                </button>
              </div>

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
                    {readiness?.promoted ? '✓' : '○'} Promoted to production
                  </li>
                </ul>
              </section>

              {selectedEnv.runtime_profile && Object.keys(selectedEnv.runtime_profile).length > 0 && (
                <section className="env-detail-section">
                  <h3>Runtime profile</h3>
                  <ul className="env-detail-kv">
                    {Object.entries(selectedEnv.runtime_profile).map(([k, v]) => (
                      <li key={k}><span>{k}</span> <span>{String(v)}</span></li>
                    ))}
                  </ul>
                </section>
              )}

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
                              onChange={(e) => {
                                const val = e.target.value
                                saveEnvironment.mutate(
                                  {
                                    ...selectedEnv,
                                    integration_bindings: { ...(selectedEnv.integration_bindings ?? {}), [int.id]: val },
                                  },
                                  {
                                    onSuccess: () => success('Bindings updated'),
                                    onError: () => error('Failed to update bindings'),
                                  },
                                )
                              }}
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
