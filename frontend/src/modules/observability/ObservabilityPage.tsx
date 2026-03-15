import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { RunSummary } from '../../api/observability'
import { listObservabilityRuns } from '../../api/observability'
import { listWorkflows } from '../../api/workflows'
import { listIntegrations } from '../../api/integrations'
import { aggregatedScores } from '../../api/evaluations'
import { apiClient } from '../../api/client'
import { AdminObservabilityPage } from '../admin-observability/AdminObservabilityPage'
import { EmptyState } from '../ui/feedback'
import { SkeletonTable } from '../ui/Skeleton'
import { TraceExplorer } from './TraceExplorer'
import './observability.css'

// ── Shared types ─────────────────────────────────────────────────────────
type Tab = 'overview' | 'quality' | 'governance' | 'cost' | 'runs' | 'audit'

type AuditLog = {
  id: number
  timestamp: string
  user_id?: number | null
  action: string
  resource_type: string
  resource_id: string
}

// ── Tab definitions ───────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'overview',    label: 'Operations',        emoji: '⚡' },
  { id: 'quality',     label: 'Retrieval Quality', emoji: '🎯' },
  { id: 'governance',  label: 'Governance Risk',   emoji: '🛡️' },
  { id: 'cost',        label: 'Cost Analytics',    emoji: '💰' },
  { id: 'runs',        label: 'Run History',       emoji: '📜' },
  { id: 'audit',       label: 'Audit Log',         emoji: '🔍' },
]

// ── Helpers ───────────────────────────────────────────────────────────────
function pct(num: number, total: number) {
  if (total === 0) return '—'
  return `${Math.round((num / total) * 100)}%`
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'succeeded' || status === 'active' ? 'obs-badge obs-badge--success' :
    status === 'failed' || status === 'error'      ? 'obs-badge obs-badge--error' :
    status === 'running'                           ? 'obs-badge obs-badge--running' :
                                                     'obs-badge'
  return <span className={cls}>{status}</span>
}

// ── Data fetchers (module-level stable refs) ──────────────────────────────
async function fetchAuditLogs(): Promise<AuditLog[]> {
  const { data } = await apiClient.get<AuditLog[]>('/api/admin/observability/audit-logs')
  return data
}

const RISK_KEYWORDS = ['block', 'reject', 'deny', 'fail', 'violation', 'unauthorized', 'forbidden', 'error']

// ── Operations tab ────────────────────────────────────────────────────────
function OperationsTab({ runs }: { runs: RunSummary[] }) {
  const integsQ = useQuery({ queryKey: ['integrations'], queryFn: listIntegrations })
  const integrations = integsQ.data ?? []

  const total   = runs.length
  const success = runs.filter(r => r.status === 'succeeded').length
  const failed  = runs.filter(r => r.status === 'failed').length
  const simCount = runs.filter(r => r.is_simulated).length
  const healthy = integrations.filter(i => i.health_status === 'healthy').length

  const archBreakdown = runs.reduce<Record<string, { ok: number; fail: number }>>((acc, r) => {
    const k = r.architecture_type ?? 'unknown'
    acc[k] ??= { ok: 0, fail: 0 }
    if (r.status === 'succeeded') acc[k].ok++ else acc[k].fail++
    return acc
  }, {})

  return (
    <div className="obs-dashboard">
      <div className="obs-kpi-grid">
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">{total}</div>
          <div className="obs-kpi-label">Total runs</div>
        </div>
        <div className={`obs-kpi ${success > 0 ? 'obs-kpi--success' : 'obs-kpi--neutral'}`}>
          <div className="obs-kpi-value">{pct(success, total)}</div>
          <div className="obs-kpi-label">Success rate</div>
        </div>
        <div className={`obs-kpi ${failed > 0 ? 'obs-kpi--error' : 'obs-kpi--success'}`}>
          <div className="obs-kpi-value">{failed}</div>
          <div className="obs-kpi-label">Failed runs</div>
        </div>
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">{simCount}</div>
          <div className="obs-kpi-label">Simulated runs</div>
        </div>
        <div className={`obs-kpi ${healthy === integrations.length && integrations.length > 0 ? 'obs-kpi--success' : integrations.length === 0 ? 'obs-kpi--neutral' : 'obs-kpi--warning'}`}>
          <div className="obs-kpi-value">{healthy}/{integrations.length}</div>
          <div className="obs-kpi-label">Healthy integrations</div>
        </div>
      </div>

      {runs.length > 0 && (
        <div className="obs-card">
          <h3 className="obs-card-title">Run breakdown by architecture</h3>
          <table className="obs-table">
            <thead><tr><th>Architecture</th><th>Runs</th><th>Success</th><th>Failed</th><th>Exec mode</th></tr></thead>
            <tbody>
              {Object.entries(archBreakdown).sort((a, b) => (b[1].ok + b[1].fail) - (a[1].ok + a[1].fail)).map(([arch, counts]) => {
                const total = counts.ok + counts.fail
                const wRuns = runs.filter(r => (r.architecture_type ?? 'unknown') === arch)
                return (
                  <tr key={arch}>
                    <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{arch}</td>
                    <td>{total}</td>
                    <td>{pct(counts.ok, total)}</td>
                    <td>{counts.fail > 0 ? <span className="obs-badge obs-badge--error">{counts.fail}</span> : '—'}</td>
                    <td>{wRuns.some(r => r.is_simulated) ? <span className="obs-badge">Simulated</span> : <span className="obs-badge obs-badge--success">Live</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {integrations.length > 0 && (
        <div className="obs-card">
          <h3 className="obs-card-title">Integration health</h3>
          <div className="obs-integ-rows">
            {integrations.map(i => (
              <div key={i.id} className="obs-integ-row">
                <span className={`obs-health-dot obs-health-dot--${i.health_status ?? 'unknown'}`} />
                <span className="obs-integ-name">{i.name}</span>
                <span className="obs-integ-type">{i.provider_type}</span>
                <span className={`obs-badge ${i.health_status === 'healthy' ? 'obs-badge--success' : i.health_status === 'degraded' ? 'obs-badge--warning' : 'obs-badge'}`}>
                  {i.health_status ?? 'untested'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Retrieval Quality tab ──────────────────────────────────────────────────
function RetrievalQualityTab({ runs }: { runs: RunSummary[] }) {
  const simRuns  = runs.filter(r => r.is_simulated)
  const liveRuns = runs.filter(r => !r.is_simulated)
  const scoresQ  = useQuery({ queryKey: ['aggregated-scores'], queryFn: aggregatedScores, retry: false })
  const scores   = scoresQ.data

  const avgRelevance = scores?.scores_overview?.length
    ? (scores.scores_overview.reduce((s, r) => s + r.avg_relevance, 0) / scores.scores_overview.length * 100).toFixed(0)
    : null
  const avgGroundedness = scores?.scores_overview?.length
    ? (scores.scores_overview.reduce((s, r) => s + r.avg_groundedness, 0) / scores.scores_overview.length * 100).toFixed(0)
    : null
  const topStrategy = scores?.scores_overview?.slice().sort((a, b) => b.avg_relevance - a.avg_relevance)[0]?.strategy ?? null

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
        <div className={`obs-kpi ${avgRelevance && +avgRelevance >= 70 ? 'obs-kpi--success' : 'obs-kpi--neutral'}`}>
          <div className="obs-kpi-value">{avgRelevance ? `${avgRelevance}%` : '—'}</div>
          <div className="obs-kpi-label">Avg relevance</div>
        </div>
        <div className={`obs-kpi ${avgGroundedness && +avgGroundedness >= 70 ? 'obs-kpi--success' : 'obs-kpi--neutral'}`}>
          <div className="obs-kpi-value">{avgGroundedness ? `${avgGroundedness}%` : '—'}</div>
          <div className="obs-kpi-label">Avg groundedness</div>
        </div>
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value" style={{ fontSize: '0.9rem' }}>{topStrategy ?? '—'}</div>
          <div className="obs-kpi-label">Top strategy</div>
        </div>
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">{scores?.strategies?.length ?? 0}</div>
          <div className="obs-kpi-label">Strategies benchmarked</div>
        </div>
      </div>

      {!scores && (
        <div className="obs-card obs-card--info">
          <div className="obs-card-icon">🎯</div>
          <div>
            <h3 className="obs-card-title">Retrieval quality signals</h3>
            <p className="obs-card-body">
              Run benchmarks in the <strong>Evaluation Harness</strong> to populate relevance, groundedness,
              and completeness scores here. Once scored, this tab shows live quality KPIs per strategy.
            </p>
          </div>
        </div>
      )}

      {runs.length > 0 && (
        <div className="obs-card">
          <h3 className="obs-card-title">Workflow execution breakdown</h3>
          <table className="obs-table">
            <thead><tr><th>Workflow</th><th>Runs</th><th>Success rate</th><th>Mode</th></tr></thead>
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

// ── Governance Risk tab ───────────────────────────────────────────────────
function GovernanceRiskTab() {
  const workflowsQ = useQuery({ queryKey: ['workflows'],    queryFn: listWorkflows })
  const auditQ     = useQuery({ queryKey: ['audit-logs'],   queryFn: fetchAuditLogs, retry: false })

  const workflows  = workflowsQ.data ?? []
  const auditLogs  = auditQ.data    ?? []

  const drafts = workflows.filter(w => !w.is_active)
  const active = workflows.filter(w => w.is_active)

  const violations  = auditLogs.filter(l => RISK_KEYWORDS.some(kw => (l.action ?? '').toLowerCase().includes(kw)))
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const violations7d = violations.filter(l => new Date(l.timestamp).getTime() > sevenDaysAgo)

  return (
    <div className="obs-dashboard">
      <div className="obs-kpi-grid">
        <div className={`obs-kpi ${drafts.length > 0 ? 'obs-kpi--warning' : 'obs-kpi--success'}`}>
          <div className="obs-kpi-value">{drafts.length}</div>
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
        <div className={`obs-kpi ${violations7d.length > 0 ? 'obs-kpi--error' : 'obs-kpi--success'}`}>
          <div className="obs-kpi-value">{violations7d.length}</div>
          <div className="obs-kpi-label">Policy events (7d)</div>
        </div>
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">{auditLogs.length}</div>
          <div className="obs-kpi-label">Total audit events</div>
        </div>
      </div>

      {/* Draft workflows needing review */}
      <div className="obs-card">
        <h3 className="obs-card-title">Draft workflows awaiting governance review</h3>
        {drafts.length === 0
          ? <p className="obs-empty-msg">✓ All workflows are active and published.</p>
          : (
          <table className="obs-table">
            <thead><tr><th>Workflow</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {drafts.map(w => (
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

      {/* Audit log violations */}
      <div className="obs-card">
        <h3 className="obs-card-title">
          Policy-related audit events
          {violations.length > 0 && <span className="obs-badge obs-badge--error" style={{ marginLeft: '0.5rem' }}>{violations.length}</span>}
        </h3>
        {auditQ.isLoading && <p className="obs-empty-msg">Loading audit log…</p>}
        {!auditQ.isLoading && violations.length === 0 && (
          <p className="obs-empty-msg">✓ No blocked or rejected events found in the audit log.</p>
        )}
        {!auditQ.isLoading && violations.length > 0 && (
          <table className="obs-table">
            <thead><tr><th>Time</th><th>Action</th><th>Resource</th><th>User</th></tr></thead>
            <tbody>
              {violations.slice(0, 20).map(l => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(l.timestamp).toLocaleString()}</td>
                  <td><span className="obs-badge obs-badge--error">{l.action}</span></td>
                  <td>{l.resource_type}:{l.resource_id}</td>
                  <td>{l.user_id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Cost Analytics tab ────────────────────────────────────────────────────
const ARCH_COST: Record<string, { tier: string; estPer1k: string }> = {
  vector:     { tier: 'Low',     estPer1k: '~$0.10–$0.25' },
  vectorless: { tier: 'Low',     estPer1k: '~$0.05–$0.15' },
  hybrid:     { tier: 'Medium',  estPer1k: '~$0.25–$0.60' },
  temporal:   { tier: 'Medium',  estPer1k: '~$0.20–$0.50' },
  graph:      { tier: 'High',    estPer1k: '~$0.50–$1.50' },
  unknown:    { tier: 'Unknown', estPer1k: '—' },
}

function CostAnalyticsTab({ runs }: { runs: RunSummary[] }) {
  const total     = runs.length
  const simCount  = runs.filter(r => r.is_simulated).length
  const liveCount = total - simCount

  const archBreakdown = runs.reduce<Record<string, { total: number; sim: number; live: number }>>((acc, r) => {
    const k = r.architecture_type ?? 'unknown'
    acc[k] ??= { total: 0, sim: 0, live: 0 }
    acc[k].total++
    if (r.is_simulated) acc[k].sim++ else acc[k].live++
    return acc
  }, {})

  const archRows = Object.entries(archBreakdown).sort((a, b) => b[1].total - a[1].total)
  const topArchTier = archRows.length > 0 ? (ARCH_COST[archRows[0][0]]?.tier ?? 'Unknown') : '—'

  return (
    <div className="obs-dashboard">
      <div className="obs-kpi-grid">
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">{total}</div>
          <div className="obs-kpi-label">Total runs</div>
        </div>
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value">{simCount}</div>
          <div className="obs-kpi-label">Simulated (no cost)</div>
        </div>
        <div className={`obs-kpi ${liveCount > 0 ? 'obs-kpi--success' : 'obs-kpi--neutral'}`}>
          <div className="obs-kpi-value">{liveCount}</div>
          <div className="obs-kpi-label">Live (billable)</div>
        </div>
        <div className="obs-kpi obs-kpi--neutral">
          <div className="obs-kpi-value" style={{ fontSize: '0.85rem' }}>{topArchTier}</div>
          <div className="obs-kpi-label">Top arch cost tier</div>
        </div>
      </div>

      {archRows.length > 0 && (
        <div className="obs-card">
          <h3 className="obs-card-title">Cost breakdown by architecture</h3>
          <table className="obs-table">
            <thead>
              <tr>
                <th>Architecture</th>
                <th>Total runs</th>
                <th>Simulated</th>
                <th>Live</th>
                <th>Cost tier</th>
                <th>Est. per 1k queries</th>
              </tr>
            </thead>
            <tbody>
              {archRows.map(([arch, counts]) => {
                const info = ARCH_COST[arch] ?? ARCH_COST.unknown
                return (
                  <tr key={arch}>
                    <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{arch}</td>
                    <td>{counts.total}</td>
                    <td>{counts.sim}</td>
                    <td>{counts.live}</td>
                    <td>
                      <span className={`obs-badge ${
                        info.tier === 'Low'    ? 'obs-badge--success' :
                        info.tier === 'Medium' ? 'obs-badge--warning' :
                        info.tier === 'High'   ? 'obs-badge--error'   : ''
                      }`}>{info.tier}</span>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: '#94a3b8' }}>{info.estPer1k}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="obs-card obs-card--info">
        <div className="obs-card-icon">💰</div>
        <div>
          <h3 className="obs-card-title">Connect live cost data</h3>
          <p className="obs-card-body">
            Actual token spend will appear once live RAG execution is enabled and an LLM integration
            with usage reporting is configured. Cost tiers above are estimates based on architecture complexity.
          </p>
          <p className="obs-card-body">
            For detailed pre-live estimation, use <strong>Operate → Cost &amp; ROI Calculator</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export function ObservabilityPage() {
  const [tab, setTab]                         = useState<Tab>('overview')
  const [workflowFilter, setWorkflowFilter]   = useState('')
  const [statusFilter, setStatusFilter]       = useState('')
  const [simulatedFilter, setSimulatedFilter] = useState<boolean | ''>('')
  const [selectedRunId, setSelectedRunId]     = useState<number | null>(null)

  const workflowsQuery = useQuery({ queryKey: ['workflows'], queryFn: listWorkflows })
  const runsQuery = useQuery({
    queryKey: ['observability-runs', workflowFilter || undefined, statusFilter || undefined, simulatedFilter === '' ? undefined : simulatedFilter],
    queryFn: () =>
      listObservabilityRuns({
        ...(workflowFilter        ? { workflow_id: workflowFilter }     : {}),
        ...(statusFilter          ? { status: statusFilter }            : {}),
        ...(simulatedFilter !== '' ? { is_simulated: simulatedFilter }  : {}),
      }),
  })

  const workflows = workflowsQuery.data ?? []
  const allRuns   = useMemo(() => runsQuery.data ?? [], [runsQuery.data])
  const runs      = allRuns

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

      {tab === 'overview'    && <OperationsTab runs={allRuns} />}
      {tab === 'quality'     && <RetrievalQualityTab runs={allRuns} />}
      {tab === 'governance'  && <GovernanceRiskTab />}
      {tab === 'cost'        && <CostAnalyticsTab runs={allRuns} />}

      {/* ── Run History ── */}
      {tab === 'runs' && (
        <>
          <section className="obs-section">
            <h2>Workflow runs</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#94a3b8' }}>Workflow</span>
                <select value={workflowFilter} onChange={e => setWorkflowFilter(e.target.value)}
                  style={{ padding: '0.35rem 0.5rem', borderRadius: '0.35rem', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', minWidth: '140px' }}>
                  <option value="">All</option>
                  {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#94a3b8' }}>Status</span>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
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
                  onChange={e => setSimulatedFilter(e.target.value === '' ? '' : e.target.value === 'true')}
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
                      style={{ background: selectedRunId === r.id ? 'rgba(56,178,172,0.1)' : undefined, cursor: 'pointer' }}>
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
            <div style={{ marginTop: '1rem' }}>
              <TraceExplorer runId={selectedRunId} onClose={() => setSelectedRunId(null)} />
            </div>
          )}
        </>
      )}

      {/* ── Audit Log ── */}
      {tab === 'audit' && (
        <section className="obs-section">
          <AdminObservabilityPage />
        </section>
      )}
    </div>
  )
}
