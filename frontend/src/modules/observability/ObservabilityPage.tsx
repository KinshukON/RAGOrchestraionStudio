import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { RunSummary, TaskSummary } from '../../api/observability'
import {
  listObservabilityRuns,
  getObservabilityRun,
  listObservabilityRunTasks,
} from '../../api/observability'
import { listWorkflows } from '../../api/workflows'
import { listIntegrations } from '../../api/integrations'
import { AdminObservabilityPage } from '../admin-observability/AdminObservabilityPage'
import { EmptyState, LoadingMessage } from '../ui/feedback'
import { SkeletonTable } from '../ui/Skeleton'
import './observability.css'

type Tab = 'overview' | 'quality' | 'governance' | 'cost' | 'runs' | 'audit'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'overview',    label: 'Operations',        emoji: '📊' },
  { id: 'quality',     label: 'Retrieval Quality',  emoji: '🎯' },
  { id: 'governance',  label: 'Governance Risk',    emoji: '🛡️' },
  { id: 'cost',        label: 'Cost Analytics',     emoji: '💰' },
  { id: 'runs',        label: 'Run History',        emoji: '🔄' },
  { id: 'audit',       label: 'Audit Log',          emoji: '📋' },
]

// ── Helpers ──────────────────────────────────────────────────────────────
function pct(n: number, d: number) { return d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%` }

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'succeeded' ? 'obs-badge obs-badge--success' :
    status === 'failed'    ? 'obs-badge obs-badge--error' :
    'obs-badge'
  return <span className={cls}>{status}</span>
}

// ── Operations Overview tab ───────────────────────────────────────────────
function OperationsTab({ runs }: { runs: RunSummary[] }) {
  const integrations = useQuery({ queryKey: ['integrations'], queryFn: listIntegrations, staleTime: 30_000 })

  const total = runs.length
  const succeeded = runs.filter(r => r.status === 'succeeded').length
  const failed = runs.filter(r => r.status === 'failed').length
  const simulated = runs.filter(r => r.is_simulated).length
  const integList = integrations.data ?? []
  const healthy = integList.filter(i => i.health_status === 'healthy').length
  const degraded = integList.filter(i => i.health_status === 'degraded').length
  const untested = integList.filter(i => !i.health_status).length

  return (
    <div className="obs-dashboard">
      <div className="obs-kpi-grid">
        <div className="obs-kpi obs-kpi--success">
          <div className="obs-kpi-value">{total}</div>
          <div className="obs-kpi-label">Total runs</div>
        </div>
        <div className="obs-kpi obs-kpi--success">
          <div className="obs-kpi-value">{pct(succeeded, total)}</div>
          <div className="obs-kpi-label">Success rate</div>
        </div>
        <div className={`obs-kpi ${failed > 0 ? 'obs-kpi--error' : 'obs-kpi--neutral'}`}>
          <div className="obs-kpi-value">{failed}</div>
          <div className="obs-kpi-label">Failed runs</div>
        </div>
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">{simulated}</div>
          <div className="obs-kpi-label">Simulated</div>
        </div>
        <div className={`obs-kpi ${degraded > 0 ? 'obs-kpi--warning' : 'obs-kpi--success'}`}>
          <div className="obs-kpi-value">{healthy}/{integList.length}</div>
          <div className="obs-kpi-label">Integrations healthy</div>
        </div>
        <div className={`obs-kpi ${untested > 0 ? 'obs-kpi--warning' : 'obs-kpi--neutral'}`}>
          <div className="obs-kpi-value">{untested}</div>
          <div className="obs-kpi-label">Untested connectors</div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="obs-card">
        <h3 className="obs-card-title">Run status breakdown</h3>
        {total === 0
          ? <p className="obs-empty-msg">No runs yet — run a simulation from Query Lab.</p>
          : (
          <div className="obs-stacked-bar-wrap">
            <div className="obs-stacked-bar">
              {succeeded > 0 && <div className="obs-bar-seg obs-bar-seg--success" style={{ width: pct(succeeded, total) }} title={`Succeeded: ${succeeded}`} />}
              {failed > 0    && <div className="obs-bar-seg obs-bar-seg--error"   style={{ width: pct(failed, total) }}    title={`Failed: ${failed}`} />}
              {(total - succeeded - failed) > 0 && <div className="obs-bar-seg obs-bar-seg--neutral" style={{ width: pct(total - succeeded - failed, total) }} title="Other" />}
            </div>
            <div className="obs-stacked-legend">
              <span><span className="obs-dot obs-dot--success"/>Succeeded ({succeeded})</span>
              <span><span className="obs-dot obs-dot--error"/>Failed ({failed})</span>
              <span><span className="obs-dot obs-dot--neutral"/>Other ({total - succeeded - failed})</span>
            </div>
          </div>
        )}
      </div>

      {/* Integration health */}
      <div className="obs-card">
        <h3 className="obs-card-title">Integration health</h3>
        {integList.length === 0
          ? <p className="obs-empty-msg">No integrations configured yet.</p>
          : (
          <div className="obs-int-rows">
            {integList.map(i => (
              <div key={i.id} className="obs-int-row">
                <span className={`obs-health-dot obs-health-dot--${i.health_status ?? 'unknown'}`} />
                <span className="obs-int-name">{i.name}</span>
                <span className="obs-int-type">{i.provider_type}</span>
                <span className={`obs-badge obs-badge--${i.health_status === 'healthy' ? 'success' : i.health_status === 'degraded' ? 'warning' : 'neutral'}`}>
                  {i.health_status ?? 'untested'}
                </span>
                {i.last_tested_at && <span className="obs-int-tested">tested {new Date(i.last_tested_at).toLocaleDateString()}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Retrieval Quality tab ────────────────────────────────────────────────
function RetrievalQualityTab({ runs }: { runs: RunSummary[] }) {
  const simRuns = runs.filter(r => r.is_simulated)
  const liveRuns = runs.filter(r => !r.is_simulated)

  return (
    <div className="obs-dashboard">
      <div className="obs-kpi-grid">
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">{simRuns.length}</div>
          <div className="obs-kpi-label">Simulated runs</div>
        </div>
        <div className="obs-kpi obs-kpi--success">
          <div className="obs-kpi-value">{liveRuns.length}</div>
          <div className="obs-kpi-label">Live runs</div>
        </div>
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">—</div>
          <div className="obs-kpi-label">Avg relevance score</div>
        </div>
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">—</div>
          <div className="obs-kpi-label">Avg grounding score</div>
        </div>
      </div>

      <div className="obs-card obs-card--info">
        <div className="obs-card-icon">🎯</div>
        <div>
          <h3 className="obs-card-title">Retrieval quality signals</h3>
          <p className="obs-card-body">
            Retrieval relevance, grounding score, citation completeness, and freshness signals will appear here
            once live RAG execution is enabled. Right now all runs are simulated.
          </p>
          <p className="obs-card-body">
            To unlock quality analytics: connect a vector store integration, configure an environment,
            and promote a workflow to <strong>live</strong> execution from the Environments page.
          </p>
        </div>
      </div>

      {runs.length > 0 && (
        <div className="obs-card">
          <h3 className="obs-card-title">Run quality by workflow</h3>
          <table className="obs-table">
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Runs</th>
                <th>Success rate</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                runs.reduce<Record<string, RunSummary[]>>((acc, r) => {
                  const key = String(r.workflow_id)
                  acc[key] = acc[key] ?? []
                  acc[key].push(r)
                  return acc
                }, {})
              ).map(([wid, wRuns]) => (
                <tr key={wid}>
                  <td>{wid}</td>
                  <td>{wRuns.length}</td>
                  <td>{pct(wRuns.filter(r => r.status === 'succeeded').length, wRuns.length)}</td>
                  <td>{wRuns.some(r => r.is_simulated) ? <span className="obs-badge">Simulated</span> : <span className="obs-badge obs-badge--success">Live</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Governance Risk tab ──────────────────────────────────────────────────
function GovernanceRiskTab() {
  const workflowsQ = useQuery({ queryKey: ['workflows'], queryFn: listWorkflows })
  const workflows = workflowsQ.data ?? []

  const blockedPublish = workflows.filter(w => !w.is_active)
  const active = workflows.filter(w => w.is_active)

  return (
    <div className="obs-dashboard">
      <div className="obs-kpi-grid">
        <div className={`obs-kpi ${blockedPublish.length > 0 ? 'obs-kpi--warning' : 'obs-kpi--success'}`}>
          <div className="obs-kpi-value">{blockedPublish.length}</div>
          <div className="obs-kpi-label">Unpublished drafts</div>
        </div>
        <div className="obs-kpi obs-kpi--success">
          <div className="obs-kpi-value">{active.length}</div>
          <div className="obs-kpi-label">Active workflows</div>
        </div>
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">{workflows.length}</div>
          <div className="obs-kpi-label">Total workflows</div>
        </div>
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">—</div>
          <div className="obs-kpi-label">Policy violations (7d)</div>
        </div>
      </div>

      <div className="obs-card">
        <h3 className="obs-card-title">Draft workflows awaiting governance review</h3>
        {blockedPublish.length === 0
          ? <p className="obs-empty-msg">✓ All workflows have been published through governance.</p>
          : (
          <table className="obs-table">
            <thead>
              <tr><th>Workflow</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {blockedPublish.map(w => (
                <tr key={w.id}>
                  <td>{w.name}</td>
                  <td><StatusBadge status={w.is_active ? 'active' : 'draft'} /></td>
                  <td><a className="obs-link" href="/app/workflow-builder">Open in Builder</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="obs-card obs-card--info">
        <div className="obs-card-icon">🛡️</div>
        <div>
          <h3 className="obs-card-title">Live governance violation tracking</h3>
          <p className="obs-card-body">
            Blocked publish/promote events, approval aging, and risky workflow flagging will be
            surfaced here from the audit log. Policy violation drill-down and per-workflow risk score
            are part of <strong>Phase 2 observability</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Cost Analytics tab ───────────────────────────────────────────────────
function CostAnalyticsTab({ runs }: { runs: RunSummary[] }) {
  const total = runs.length
  const simCount = runs.filter(r => r.is_simulated).length
  const liveCount = total - simCount

  return (
    <div className="obs-dashboard">
      <div className="obs-kpi-grid">
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">{total}</div>
          <div className="obs-kpi-label">Total query runs</div>
        </div>
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">{simCount}</div>
          <div className="obs-kpi-label">Simulated (no cost)</div>
        </div>
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">{liveCount}</div>
          <div className="obs-kpi-label">Live (billable)</div>
        </div>
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">—</div>
          <div className="obs-kpi-label">Token spend (est.)</div>
        </div>
      </div>

      <div className="obs-card obs-card--info">
        <div className="obs-card-icon">💰</div>
        <div>
          <h3 className="obs-card-title">Live cost instrumentation</h3>
          <p className="obs-card-body">
            Token spend by architecture, retrieval cost per workflow, cost drift over time,
            and expensive workflow identification will appear here once live execution is enabled.
          </p>
          <p className="obs-card-body">
            For now, use the <strong>Cost &amp; ROI Calculator</strong> under Operate → Cost &amp; ROI
            to estimate and compare architecture costs before going live.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────
export function ObservabilityPage() {
  const [tab, setTab] = useState<Tab>('overview')
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
  const allRuns = useMemo(() => runsQuery.data ?? [], [runsQuery.data])
  const runs = allRuns
  const runDetail = runDetailQuery.data
  const tasks = runTasksQuery.data ?? []

  return (
    <div className="obs-page-root">
      <header className="obs-page-header">
        <div>
          <h1>Observability</h1>
          <p>Operational command centre — monitor runs, quality, governance risk, and cost across all architectures.</p>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <nav className="obs-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            className={`obs-tab ${tab === t.id ? 'obs-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="obs-tab-emoji">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Operations overview ── */}
      {tab === 'overview' && <OperationsTab runs={allRuns} />}

      {/* ── Retrieval Quality ── */}
      {tab === 'quality' && <RetrievalQualityTab runs={allRuns} />}

      {/* ── Governance Risk ── */}
      {tab === 'governance' && <GovernanceRiskTab />}

      {/* ── Cost Analytics ── */}
      {tab === 'cost' && <CostAnalyticsTab runs={allRuns} />}

      {/* ── Run History (existing) ── */}
      {tab === 'runs' && (
        <>
          <section className="obs-section">
            <h2>Workflow runs</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#94a3b8' }}>Workflow</span>
                <select value={workflowFilter} onChange={(e) => setWorkflowFilter(e.target.value)}
                  style={{ padding: '0.35rem 0.5rem', borderRadius: '0.35rem', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', minWidth: '140px' }}>
                  <option value="">All</option>
                  {workflows.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#94a3b8' }}>Status</span>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ padding: '0.35rem 0.5rem', borderRadius: '0.35rem', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', minWidth: '100px' }}>
                  <option value="">All</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#94a3b8' }}>Simulated</span>
                <select value={simulatedFilter === '' ? '' : simulatedFilter ? 'true' : 'false'}
                  onChange={(e) => setSimulatedFilter(e.target.value === '' ? '' : e.target.value === 'true')}
                  style={{ padding: '0.35rem 0.5rem', borderRadius: '0.35rem', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', minWidth: '100px' }}>
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
            </div>
            {runsQuery.isLoading && <SkeletonTable rows={4} cols={5} />}
            {!runsQuery.isLoading && runs.length === 0 && (
              <EmptyState title="No runs yet" description="Run a simulation from Query Lab to see workflow runs and task timelines here." />
            )}
            {!runsQuery.isLoading && runs.length > 0 && (
              <table className="obs-table">
                <thead><tr><th>ID</th><th>Workflow</th><th>Status</th><th>Created</th><th>Simulated</th></tr></thead>
                <tbody>
                  {runs.map((r: RunSummary) => (
                    <tr key={r.id} onClick={() => setSelectedRunId(r.id)}
                      style={{ background: selectedRunId === r.id ? 'rgba(56,178,172,0.1)' : undefined }}>
                      <td>{r.id}</td>
                      <td>{r.workflow_id}</td>
                      <td><StatusBadge status={r.status} /></td>
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
                    {runDetail.started_at  && <li><strong>Started</strong>  {new Date(runDetail.started_at).toLocaleString()}</li>}
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

      {/* ── Audit Log (existing) ── */}
      {tab === 'audit' && (
        <section className="obs-section">
          <AdminObservabilityPage />
        </section>
      )}
    </div>
  )
}
