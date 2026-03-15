import { useQuery } from '@tanstack/react-query'
import { listWorkflows } from '../../api/workflows'
import { listEnvironments } from '../../api/environments'
import { listIntegrations } from '../../api/integrations'
import { aggregatedScores } from '../../api/evaluations'
import { listObservabilityRuns } from '../../api/observability'
import { useNavigate } from 'react-router-dom'
import './executive-summary.css'

function MetricCard({ label, value, sub, variant }: { label: string; value: string | number; sub?: string; variant?: 'ok' | 'warn' | 'info' }) {
  return (
    <div className={`ex-metric ex-metric--${variant ?? 'info'}`}>
      <div className="ex-metric-value">{value}</div>
      <div className="ex-metric-label">{label}</div>
      {sub && <div className="ex-metric-sub">{sub}</div>}
    </div>
  )
}

export function ExecutiveSummaryPage() {
  const navigate = useNavigate()

  const workflowsQ  = useQuery({ queryKey: ['workflows'],          queryFn: listWorkflows })
  const envsQ       = useQuery({ queryKey: ['environments'],        queryFn: listEnvironments })
  const integsQ     = useQuery({ queryKey: ['integrations'],        queryFn: listIntegrations })
  const evalQ       = useQuery({ queryKey: ['aggregated-scores'],   queryFn: aggregatedScores })
  const runsQ       = useQuery({ queryKey: ['observability-runs'],  queryFn: () => listObservabilityRuns() })

  const workflows  = workflowsQ.data  ?? []
  const envs       = envsQ.data       ?? []
  const integs     = integsQ.data     ?? []
  const runs       = runsQ.data       ?? []
  const scores     = evalQ.data

  // Computed KPIs
  const activeWorkflows = workflows.filter(w => w.is_active).length
  const promotedEnvs    = envs.filter(e => e.promotion_status === 'promoted').length
  const healthyInteg    = integs.filter(i => i.health_status === 'healthy').length
  const totalRuns       = runs.length
  const successRate     = totalRuns === 0 ? null :
    Math.round((runs.filter(r => r.status === 'succeeded').length / totalRuns) * 100)

  const avgRelevance = scores?.scores_overview?.length
    ? (scores.scores_overview.reduce((sum, s) => sum + s.avg_relevance, 0) / scores.scores_overview.length * 100).toFixed(0)
    : null

  const avgGroundedness = scores?.scores_overview?.length
    ? (scores.scores_overview.reduce((sum, s) => sum + s.avg_groundedness, 0) / scores.scores_overview.length * 100).toFixed(0)
    : null

  const topStrategy = scores?.scores_overview?.length
    ? scores.scores_overview.slice().sort((a, b) => b.avg_relevance - a.avg_relevance)[0]?.strategy
    : null

  const archBreakdown = workflows.reduce<Record<string, number>>((acc, w) => {
    const k = w.architecture_type || 'unknown'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="ex-root">
      <div className="ex-header">
        <div>
          <h1 className="ex-title">Executive Summary</h1>
          <p className="ex-subtitle">At-a-glance platform health, quality, and operational readiness — updated on every page load.</p>
        </div>
        <div className="ex-as-of">
          As of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* ── KPI tier 1: Platform health ── */}
      <section className="ex-section">
        <h2 className="ex-section-title">Platform health</h2>
        <div className="ex-kpi-grid">
          <MetricCard label="Active workflows"    value={activeWorkflows} sub={`of ${workflows.length} total`}  variant={activeWorkflows > 0 ? 'ok' : 'warn'} />
          <MetricCard label="Promoted environments" value={promotedEnvs} sub={`of ${envs.length} environments`} variant={promotedEnvs > 0 ? 'ok' : 'warn'} />
          <MetricCard label="Healthy integrations"  value={`${healthyInteg}/${integs.length}`} sub="connectors" variant={healthyInteg === integs.length ? 'ok' : 'warn'} />
          <MetricCard label="Run success rate"    value={successRate !== null ? `${successRate}%` : '—'} sub={`from ${totalRuns} runs`} variant={successRate === null ? 'info' : successRate >= 80 ? 'ok' : 'warn'} />
        </div>
      </section>

      {/* ── KPI tier 2: Quality ── */}
      <section className="ex-section">
        <h2 className="ex-section-title">Retrieval quality</h2>
        <div className="ex-kpi-grid">
          <MetricCard label="Avg relevance score"    value={avgRelevance    ? `${avgRelevance}%`    : '—'} sub="across all strategies" variant={avgRelevance && +avgRelevance >= 70 ? 'ok' : 'info'} />
          <MetricCard label="Avg groundedness score" value={avgGroundedness ? `${avgGroundedness}%` : '—'} sub="across all strategies" variant={avgGroundedness && +avgGroundedness >= 70 ? 'ok' : 'info'} />
          <MetricCard label="Top strategy" value={topStrategy ?? '—'} sub="by relevance" variant="info" />
          <MetricCard label="Strategies benchmarked" value={scores?.strategies?.length ?? 0} sub="in evaluation harness" variant="info" />
        </div>
        {!scores && (
          <p className="ex-hint">Run evaluations in the <button className="ex-link" onClick={() => navigate('/app/evaluation')}>Evaluation Harness</button> to populate these scores.</p>
        )}
      </section>

      {/* ── Architecture mix ── */}
      {Object.keys(archBreakdown).length > 0 && (
        <section className="ex-section">
          <h2 className="ex-section-title">Architecture portfolio</h2>
          <div className="ex-arch-bars">
            {Object.entries(archBreakdown).sort((a, b) => b[1] - a[1]).map(([arch, count]) => (
              <div key={arch} className="ex-arch-row">
                <span className="ex-arch-label">{arch}</span>
                <div className="ex-arch-bar-wrap">
                  <div className="ex-arch-bar" data-arch={arch}
                    style={{ width: `${(count / workflows.length) * 100}%` }} />
                </div>
                <span className="ex-arch-count">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Integration health detail ── */}
      <section className="ex-section">
        <h2 className="ex-section-title">Integration health</h2>
        {integs.length === 0
          ? <p className="ex-hint">No integrations configured. <button className="ex-link" onClick={() => navigate('/app/integrations')}>Add connectors</button> to complete your stack.</p>
          : (
          <div className="ex-integ-rows">
            {integs.map(i => (
              <div key={i.id} className="ex-integ-row">
                <span className={`ex-health-dot ex-health-dot--${i.health_status ?? 'unknown'}`} />
                <span className="ex-integ-name">{i.name}</span>
                <span className="ex-integ-type">{i.provider_type}</span>
                <span className={`ex-badge ex-badge--${i.health_status === 'healthy' ? 'ok' : i.health_status === 'degraded' ? 'warn' : 'neutral'}`}>
                  {i.health_status ?? 'untested'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Quick links ── */}
      <section className="ex-section">
        <h2 className="ex-section-title">Quick actions</h2>
        <div className="ex-quick-actions">
          <button className="ex-action-card" onClick={() => navigate('/app')}>
            <span>🗂️</span>
            <span>Browse catalog</span>
          </button>
          <button className="ex-action-card" onClick={() => navigate('/app/designer')}>
            <span>🧩</span>
            <span>Guided Designer</span>
          </button>
          <button className="ex-action-card" onClick={() => navigate('/app/evaluation')}>
            <span>📊</span>
            <span>Evaluation Harness</span>
          </button>
          <button className="ex-action-card" onClick={() => navigate('/app/observability')}>
            <span>🔭</span>
            <span>Observability</span>
          </button>
          <button className="ex-action-card" onClick={() => navigate('/app/cost-roi')}>
            <span>💰</span>
            <span>Cost & ROI</span>
          </button>
          <button className="ex-action-card" onClick={() => navigate('/app/industry-packs')}>
            <span>📦</span>
            <span>Industry Packs</span>
          </button>
        </div>
      </section>
    </div>
  )
}
