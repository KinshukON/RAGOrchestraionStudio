import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listWorkflows } from '../../api/workflows'
import { listEnvironments } from '../../api/environments'
import { listIntegrations } from '../../api/integrations'
import { aggregatedScores } from '../../api/evaluations'
import { listObservabilityRuns } from '../../api/observability'
import { fetchExecutiveKpis, fetchActionBoard, fetchBusinessCase, fetchRoiSummary } from '../../api/executive'
import { useNavigate } from 'react-router-dom'
import './executive-summary.css'

function fmtUSD(n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }

type ExecTab = 'overview' | 'actions' | 'roi' | 'business-case'

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
  const [tab, setTab] = useState<ExecTab>('overview')
  const [bcArch, setBcArch] = useState('hybrid')
  const [bcVariant, setBcVariant] = useState<'executive' | 'technical' | 'governance'>('executive')

  const workflowsQ  = useQuery({ queryKey: ['workflows'],          queryFn: listWorkflows })
  const envsQ       = useQuery({ queryKey: ['environments'],        queryFn: listEnvironments })
  const integsQ     = useQuery({ queryKey: ['integrations'],        queryFn: listIntegrations })
  const evalQ       = useQuery({ queryKey: ['aggregated-scores'],   queryFn: aggregatedScores })
  const runsQ       = useQuery({ queryKey: ['observability-runs'],  queryFn: () => listObservabilityRuns() })

  // WS-6/7 executive API
  const kpisQ       = useQuery({ queryKey: ['exec-kpis'],           queryFn: fetchExecutiveKpis })
  const actionsQ    = useQuery({ queryKey: ['exec-actions'],        queryFn: fetchActionBoard, enabled: tab === 'actions' })
  const roiQ        = useQuery({ queryKey: ['exec-roi'],            queryFn: fetchRoiSummary, enabled: tab === 'roi' })
  const bcQ         = useQuery({ queryKey: ['exec-bc', bcArch],     queryFn: () => fetchBusinessCase({ architecture_type: bcArch }), enabled: tab === 'business-case' })

  const workflows  = workflowsQ.data  ?? []
  const envs       = envsQ.data       ?? []
  const integs     = integsQ.data     ?? []
  const runs       = runsQ.data       ?? []
  const scores     = evalQ.data
  const kpis       = kpisQ.data?.kpis

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

  // Sprint 6: Platform headline computation
  const unhealthyIntegCount = integs.filter(i => i.health_status !== 'healthy').length
  const blockedPromotions = envs.filter(e => (e.promotion_status ?? 'draft') === 'draft' && Object.keys(e.integration_bindings ?? {}).length === 0).length
  const platformHeadline = (() => {
    if (unhealthyIntegCount > 0) return { icon: '⚠️', text: `Blocked by ${unhealthyIntegCount} unhealthy integration${unhealthyIntegCount > 1 ? 's' : ''}`, variant: 'warn' as const }
    if (blockedPromotions > 0) return { icon: '🔴', text: `${blockedPromotions} environment${blockedPromotions > 1 ? 's' : ''} missing integration bindings`, variant: 'warn' as const }
    if (workflows.length === 0) return { icon: '💡', text: 'Ready to start — create your first workflow', variant: 'info' as const }
    if (successRate !== null && successRate >= 80 && healthyInteg === integs.length) return { icon: '✅', text: 'Platform healthy — ready for pilot or production', variant: 'ok' as const }
    return { icon: '🟡', text: 'Platform operational — review recommendations for improvements', variant: 'info' as const }
  })()

  const topAction = (() => {
    if (integs.length === 0) return { text: 'Connect your first integration', route: '/app/integrations' }
    if (unhealthyIntegCount > 0) return { text: 'Fix unhealthy integrations', route: '/app/integrations' }
    if (workflows.length === 0) return { text: 'Design your first architecture', route: '/app/architectures' }
    if (envs.filter(e => (e.promotion_status ?? 'draft') === 'promoted').length === 0) return { text: 'Promote an environment to production', route: '/app/environments' }
    return { text: 'Review observability insights', route: '/app/observability' }
  })()

  const bestFitArch = topStrategy ?? (Object.entries(archBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)

  return (
    <div className="ex-root">
      <div className="ex-header">
        <div>
          <h1 className="ex-title">Executive Summary</h1>
          <p className="ex-subtitle">Platform health, quality, ROI intelligence, and actionable next steps — powered by live data.</p>
        </div>
        <div className="ex-as-of">
          As of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="ex-tab-bar">
        {([['overview', '📊 Overview'], ['actions', '🎯 Action Board'], ['roi', '💰 ROI Summary'], ['business-case', '📋 Business Case']] as [ExecTab, string][]).map(([id, label]) => (
          <button key={id} className={`ex-tab ${tab === id ? 'ex-tab--active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <>
          {/* Sprint 6: Platform headline banner */}
          <div className={`ex-headline-banner ex-headline-banner--${platformHeadline.variant}`}>
            <div className="ex-headline-main">
              <span className="ex-headline-icon">{platformHeadline.icon}</span>
              <span className="ex-headline-text">{platformHeadline.text}</span>
            </div>
            <div className="ex-headline-actions">
              {bestFitArch && (
                <span className="ex-headline-chip">🏆 Best-fit: <strong>{bestFitArch}</strong></span>
              )}
              <button className="ex-headline-cta" onClick={() => navigate(topAction.route)}>
                {topAction.text} →
              </button>
            </div>
          </div>

          {/* KPI tier 1: From executive API */}
          {kpis && (
            <section className="ex-section">
              <h2 className="ex-section-title">Live Platform KPIs</h2>
              <div className="ex-kpi-grid">
                <MetricCard label="Total runs" value={kpis.total_runs} sub="all time" variant={kpis.total_runs > 0 ? 'ok' : 'info'} />
                <MetricCard label="Success rate" value={`${kpis.success_rate}%`} sub={`${kpis.failure_rate}% failure`} variant={kpis.success_rate >= 80 ? 'ok' : 'warn'} />
                <MetricCard label="Active architectures" value={kpis.active_architectures} sub={kpis.architecture_list.join(', ') || 'none'} variant={kpis.active_architectures > 0 ? 'ok' : 'info'} />
                <MetricCard label="Total cost" value={`$${kpis.total_cost.toFixed(2)}`} sub={`$${kpis.avg_cost_per_run.toFixed(4)}/run`} variant="info" />
                <MetricCard label="Avg latency" value={kpis.avg_latency_ms !== null ? `${kpis.avg_latency_ms}ms` : '—'} sub="across all runs" variant="info" />
                <MetricCard label="Environments" value={kpis.active_environments} sub={kpis.environment_list.join(', ') || 'none'} variant={kpis.active_environments > 0 ? 'ok' : 'info'} />
              </div>
            </section>
          )}

          {/* KPI tier 2: Platform health */}
          <section className="ex-section">
            <h2 className="ex-section-title">Platform health</h2>
            <div className="ex-kpi-grid">
              <MetricCard label="Active workflows"    value={activeWorkflows} sub={`of ${workflows.length} total`}  variant={activeWorkflows > 0 ? 'ok' : 'warn'} />
              <MetricCard label="Promoted environments" value={promotedEnvs} sub={`of ${envs.length} environments`} variant={promotedEnvs > 0 ? 'ok' : 'warn'} />
              <MetricCard label="Healthy integrations"  value={`${healthyInteg}/${integs.length}`} sub="connectors" variant={healthyInteg === integs.length ? 'ok' : 'warn'} />
              <MetricCard label="Run success rate"    value={successRate !== null ? `${successRate}%` : '—'} sub={`from ${totalRuns} runs`} variant={successRate === null ? 'info' : successRate >= 80 ? 'ok' : 'warn'} />
            </div>
          </section>

          {/* KPI tier 3: Quality */}
          <section className="ex-section">
            <h2 className="ex-section-title">Retrieval quality</h2>
            <div className="ex-kpi-grid">
              <MetricCard label="Avg relevance"    value={avgRelevance    ? `${avgRelevance}%`    : '—'} sub="across all strategies" variant={avgRelevance && +avgRelevance >= 70 ? 'ok' : 'info'} />
              <MetricCard label="Avg groundedness" value={avgGroundedness ? `${avgGroundedness}%` : '—'} sub="across all strategies" variant={avgGroundedness && +avgGroundedness >= 70 ? 'ok' : 'info'} />
              <MetricCard label="Top strategy" value={topStrategy ?? '—'} sub="by relevance" variant="info" />
              <MetricCard label="Strategies benchmarked" value={scores?.strategies?.length ?? 0} sub="in evaluation harness" variant="info" />
            </div>
            {!scores && (
              <p className="ex-hint">Run evaluations in the <button className="ex-link" onClick={() => navigate('/app/evaluation')}>Evaluation Harness</button> to populate these scores.</p>
            )}
          </section>

          {/* Architecture mix */}
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

          {/* Integration health */}
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

          {/* Quick links */}
          <section className="ex-section">
            <h2 className="ex-section-title">Quick actions</h2>
            <div className="ex-quick-actions">
              <button className="ex-action-card" onClick={() => navigate('/app')}>
                <span>🗂️</span><span>Browse catalog</span>
              </button>
              <button className="ex-action-card" onClick={() => navigate('/app/designer')}>
                <span>🧩</span><span>Guided Designer</span>
              </button>
              <button className="ex-action-card" onClick={() => navigate('/app/evaluation')}>
                <span>📊</span><span>Evaluation Harness</span>
              </button>
              <button className="ex-action-card" onClick={() => navigate('/app/observability')}>
                <span>🔭</span><span>Observability</span>
              </button>
              <button className="ex-action-card" onClick={() => navigate('/app/cost-roi')}>
                <span>💰</span><span>Cost & ROI</span>
              </button>
              <button className="ex-action-card" onClick={() => navigate('/app/industry-packs')}>
                <span>📦</span><span>Industry Packs</span>
              </button>
            </div>
          </section>
        </>
      )}

      {/* ── Action Board Tab ── */}
      {tab === 'actions' && (
        <section className="ex-section">
          <h2 className="ex-section-title">What to do next</h2>
          {actionsQ.isLoading ? <p style={{ color: 'var(--color-text-muted)' }}>Analyzing platform state…</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(actionsQ.data?.actions ?? []).map((a, i) => (
                <div key={i} className={`ex-action-item ex-action-item--${a.priority}`} onClick={() => navigate(a.link)} style={{ cursor: 'pointer' }}>
                  <div className="ex-action-priority">
                    <span className={`ex-badge ex-badge--${a.priority === 'high' ? 'warn' : a.priority === 'medium' ? 'ok' : 'neutral'}`}>{a.priority}</span>
                    <span className="ex-action-category">{a.category}</span>
                  </div>
                  <h3 className="ex-action-title">{a.title}</h3>
                  <p className="ex-action-desc">{a.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── ROI Summary Tab ── */}
      {tab === 'roi' && (
        <section className="ex-section">
          <h2 className="ex-section-title">Cross-Architecture ROI Comparison</h2>
          {roiQ.isLoading ? <p style={{ color: 'var(--color-text-muted)' }}>Loading ROI data…</p> : roiQ.data ? (
            <>
              {roiQ.data.recommended && (
                <div className="ex-rec-banner">
                  🏆 <strong>Top recommendation:</strong> {roiQ.data.recommended} — highest net monthly savings.
                </div>
              )}
              <table className="ex-roi-table">
                <thead>
                  <tr>
                    <th>Architecture</th>
                    <th>Monthly Cost</th>
                    <th>Monthly Value</th>
                    <th>Net/mo</th>
                    <th>Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {(roiQ.data.architectures ?? []).map(a => (
                    <tr key={a.type} className={a.type === roiQ.data!.recommended ? 'ex-roi-highlight' : ''}>
                      <td><strong>{a.label}</strong></td>
                      <td>{fmtUSD(a.monthly_cost)}</td>
                      <td>{fmtUSD(a.monthly_value)}</td>
                      <td style={{ color: a.monthly_net > 0 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 700 }}>
                        {a.monthly_net > 0 ? '+' : ''}{fmtUSD(a.monthly_net)}
                      </td>
                      <td>{a.latency_ms}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : <p>No ROI data available.</p>}
        </section>
      )}

      {/* ── Business Case Tab ── */}
      {tab === 'business-case' && (
        <section className="ex-section">
          <h2 className="ex-section-title">Business Case Generator</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Architecture:</label>
            <select value={bcArch} onChange={e => setBcArch(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)', fontSize: '0.82rem' }}>
              {['hybrid', 'vector', 'vectorless', 'graph', 'temporal', 'agentic', 'self_rag', 'hyde'].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <span style={{ color: 'var(--color-border)' }}>|</span>
            <div className="ex-bc-variants">
              {(['executive', 'technical', 'governance'] as const).map(v => (
                <button key={v} className={`ex-bc-variant-btn ${bcVariant === v ? 'ex-bc-variant-btn--active' : ''}`}
                  onClick={() => setBcVariant(v)}>
                  {v === 'executive' ? '💼 Executive' : v === 'technical' ? '⚙️ Technical' : '🛡️ Governance'}
                </button>
              ))}
            </div>
          </div>

          {/* Variant-specific framing */}
          <div className="ex-bc-variant-frame">
            {bcVariant === 'executive' && (
              <p className="ex-bc-variant-desc">💼 <strong>Executive view</strong> — savings narrative, payback period, and recommendation in plain English for budget holders.</p>
            )}
            {bcVariant === 'technical' && (
              <p className="ex-bc-variant-desc">⚙️ <strong>Technical justification</strong> — architecture reasoning, latency, throughput, infrastructure requirements, and integration dependencies.</p>
            )}
            {bcVariant === 'governance' && (
              <p className="ex-bc-variant-desc">🛡️ <strong>Governance & risk</strong> — audit coverage, compliance posture, explainability guarantees, and risk reduction metrics.</p>
            )}
          </div>

          {bcQ.isLoading ? <p style={{ color: 'var(--color-text-muted)' }}>Generating business case…</p> : bcQ.data ? (
            <div className="ex-bc-document">
              <div className="ex-bc-section">
                <h3>Architecture</h3>
                <p><strong>{bcQ.data.architecture.label}</strong> — {bcQ.data.architecture.latency_ms}ms avg latency</p>
              </div>

              <div className="ex-bc-section">
                <h3>Investment</h3>
                <div className="ex-kpi-grid">
                  <MetricCard label="Setup cost" value={fmtUSD(bcQ.data.investment.platform_setup_cost)} variant="info" />
                  <MetricCard label="Monthly operating" value={fmtUSD(bcQ.data.investment.monthly_operating_cost)} variant="info" />
                  <MetricCard label="Annual operating" value={fmtUSD(bcQ.data.investment.annual_operating_cost)} variant="info" />
                </div>
              </div>

              <div className="ex-bc-section">
                <h3>Returns</h3>
                <div className="ex-kpi-grid">
                  <MetricCard label="Monthly value" value={fmtUSD(bcQ.data.returns.monthly_business_value)} variant="ok" />
                  <MetricCard label="Net savings/mo" value={`${bcQ.data.returns.monthly_net_savings > 0 ? '+' : ''}${fmtUSD(bcQ.data.returns.monthly_net_savings)}`}
                    variant={bcQ.data.returns.monthly_net_savings > 0 ? 'ok' : 'warn'} />
                  <MetricCard label="Payback period" value={bcQ.data.returns.payback_period_months != null ? `${bcQ.data.returns.payback_period_months} months` : 'N/A'}
                    variant={bcQ.data.returns.payback_period_months != null && bcQ.data.returns.payback_period_months <= 6 ? 'ok' : 'warn'} />
                  <MetricCard label="Annual net" value={`${bcQ.data.returns.annual_net_savings > 0 ? '+' : ''}${fmtUSD(bcQ.data.returns.annual_net_savings)}`}
                    variant={bcQ.data.returns.annual_net_savings > 0 ? 'ok' : 'warn'} />
                </div>
              </div>

              <div className="ex-bc-section">
                <h3>Impact Breakdown (Monthly)</h3>
                <div className="ex-bc-impacts">
                  {Object.entries(bcQ.data.impact_breakdown).map(([key, val]) => (
                    <div key={key} className="ex-bc-impact-row">
                      <span className="ex-bc-impact-label">{key.replace(/_/g, ' ')}</span>
                      <span className="ex-bc-impact-value">{fmtUSD(val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ex-bc-section">
                <h3>Executive Recommendation</h3>
                <div className="ex-bc-reco">
                  <p style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{bcQ.data.executive_recommendation.recommendation}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{bcQ.data.executive_recommendation.why_this_architecture}</p>
                  <h4>Next Steps:</h4>
                  <ol style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', paddingLeft: '1.2rem' }}>
                    {bcQ.data.executive_recommendation.next_steps.map((s, i) => (
                      <li key={i} style={{ marginBottom: '0.35rem' }}>{s}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ) : <p>Select an architecture to generate a business case.</p>}
        </section>
      )}
    </div>
  )
}
