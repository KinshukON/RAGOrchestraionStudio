import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { RunSummary, TaskSummary } from '../../api/observability'
import {
  listObservabilityRuns,
  getObservabilityRun,
  listObservabilityRunTasks,
} from '../../api/observability'
import { listWorkflows } from '../../api/workflows'
import { AdminObservabilityPage } from '../admin-observability/AdminObservabilityPage'
import { EmptyState, LoadingMessage } from '../ui/feedback'
import { SkeletonTable } from '../ui/Skeleton'
import './observability.css'

type Tab = 'runs' | 'audit'

export function ObservabilityPage() {
  const [tab, setTab] = useState<Tab>('runs')
  const [workflowFilter, setWorkflowFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [simulatedFilter, setSimulatedFilter] = useState<boolean | ''>('')
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)

  const workflowsQuery = useQuery({ queryKey: ['workflows'], queryFn: listWorkflows })
  const runsQuery = useQuery({
    queryKey: ['observability-runs', workflowFilter || undefined, statusFilter || undefined, simulatedFilter === '' ? undefined : simulatedFilter],
    queryFn: () =>
      listObservabilityRuns({
        ...(workflowFilter ? { workflow_id: workflowFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(simulatedFilter !== '' ? { is_simulated: simulatedFilter } : {}),
      }),
  })
  const runDetailQuery = useQuery({
    queryKey: ['observability-run', selectedRunId],
    queryFn: () => getObservabilityRun(selectedRunId!),
    enabled: selectedRunId != null,
  })
  const runTasksQuery = useQuery({
    queryKey: ['observability-run-tasks', selectedRunId],
    queryFn: () => listObservabilityRunTasks(selectedRunId!),
    enabled: selectedRunId != null,
  })

  const workflows = workflowsQuery.data ?? []
  const runs = runsQuery.data ?? []
  const runDetail = runDetailQuery.data
  const tasks = runTasksQuery.data ?? []

  return (
    <div className="obs-page-root">
      <header className="obs-page-header">
        <div>
          <h1>Observability &amp; Trace Analytics</h1>
          <p>
            Inspect workflow runs, task timelines, and audit events. Runs from Query Lab simulations appear here.
          </p>
        </div>
      </header>

      <nav className="obs-tabs">
        <button
          type="button"
          className={tab === 'runs' ? 'obs-tab--active' : ''}
          onClick={() => setTab('runs')}
        >
          Runs
        </button>
        <button
          type="button"
          className={tab === 'audit' ? 'obs-tab--active' : ''}
          onClick={() => setTab('audit')}
        >
          Audit logs
        </button>
      </nav>

      {tab === 'runs' && (
        <>
          <section className="obs-section">
            <h2>Workflow runs</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#94a3b8' }}>Workflow</span>
                <select
                  value={workflowFilter}
                  onChange={(e) => setWorkflowFilter(e.target.value)}
                  style={{ padding: '0.35rem 0.5rem', borderRadius: '0.35rem', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', minWidth: '140px' }}
                >
                  <option value="">All</option>
                  {workflows.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#94a3b8' }}>Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ padding: '0.35rem 0.5rem', borderRadius: '0.35rem', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', minWidth: '100px' }}
                >
                  <option value="">All</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#94a3b8' }}>Simulated</span>
                <select
                  value={simulatedFilter === '' ? '' : simulatedFilter ? 'true' : 'false'}
                  onChange={(e) => setSimulatedFilter(e.target.value === '' ? '' : e.target.value === 'true')}
                  style={{ padding: '0.35rem 0.5rem', borderRadius: '0.35rem', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', minWidth: '100px' }}
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
            </div>
            {runsQuery.isLoading && <SkeletonTable rows={4} cols={5} />}
            {!runsQuery.isLoading && runs.length === 0 && (
              <EmptyState
                title="No runs yet"
                description="Run a simulation from Query Lab to see workflow runs and task timelines here."
              />
            )}
            {!runsQuery.isLoading && runs.length > 0 && (
              <table className="obs-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Workflow</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Simulated</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r: RunSummary) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRunId(r.id)}
                      style={{ background: selectedRunId === r.id ? 'rgba(56, 178, 172, 0.1)' : undefined }}
                    >
                      <td>{r.id}</td>
                      <td>{r.workflow_id}</td>
                      <td><span className="obs-badge">{r.status}</span></td>
                      <td>{new Date(r.created_at).toLocaleString()}</td>
                      <td>{r.is_simulated ? <span className="obs-badge obs-badge--simulated">Yes</span> : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {selectedRunId != null && (
            <div className="obs-layout">
              <div className="obs-detail-panel">
                <h3>Run detail</h3>
                {runDetailQuery.isLoading && <LoadingMessage label="Loading…" />}
                {runDetail && !runDetailQuery.isLoading && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
                    <li><strong>ID</strong> {runDetail.id}</li>
                    <li><strong>Workflow</strong> {runDetail.workflow_id}</li>
                    <li><strong>Status</strong> {runDetail.status}</li>
                    <li><strong>Created</strong> {new Date(runDetail.created_at).toLocaleString()}</li>
                    {runDetail.started_at && <li><strong>Started</strong> {new Date(runDetail.started_at).toLocaleString()}</li>}
                    {runDetail.finished_at && <li><strong>Finished</strong> {new Date(runDetail.finished_at).toLocaleString()}</li>}
                    {runDetail.is_simulated && <li><span className="obs-badge obs-badge--simulated">Simulated</span></li>}
                    {runDetail.environment_external_id && <li><strong>Environment</strong> {runDetail.environment_external_id}</li>}
                    {runDetail.strategy_id && <li><strong>Strategy</strong> {runDetail.strategy_id}</li>}
                  </ul>
                )}
              </div>
              <div className="obs-detail-panel">
                <h3>Task timeline</h3>
                {runTasksQuery.isLoading && <LoadingMessage label="Loading tasks…" />}
                {!runTasksQuery.isLoading && tasks.length === 0 && <p className="obs-empty">No task records for this run.</p>}
                {!runTasksQuery.isLoading && tasks.length > 0 && (
                  <ol className="obs-timeline">
                    {tasks.map((t: TaskSummary) => (
                      <li key={t.id}>
                        <span className="obs-task-status"><span className="obs-badge">{t.status}</span></span>
                        <span><strong>{t.node_id}</strong> ({t.node_type})</span>
                        {t.error && <span style={{ color: '#f87171' }}>{t.error}</span>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'audit' && (
        <section className="obs-section">
          <AdminObservabilityPage />
        </section>
      )}
    </div>
  )
}
