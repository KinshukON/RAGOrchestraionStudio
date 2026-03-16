import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listCostProfiles, calculateCost, saveScenario, listScenarios, deleteScenario, type CalculateResponse } from '../../api/costRoi'
import { useToast } from '../ui/ToastContext'
import './cost-roi.css'

function fmtUSD(n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtK(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toString() }

export function CostRoiPage() {
  const qc = useQueryClient()
  const { success, error: toastError } = useToast()

  // ── Fetch profiles from DB ──
  const profilesQ = useQuery({ queryKey: ['cost-profiles'], queryFn: listCostProfiles })
  const profiles = Array.isArray(profilesQ.data) ? profilesQ.data : []
  const scenariosQ = useQuery({ queryKey: ['cost-scenarios'], queryFn: () => listScenarios() })
  const savedScenarios = Array.isArray(scenariosQ.data) ? scenariosQ.data : []

  // ── State ──
  const [arch, setArch] = useState('')
  const [monthly, setMonthly] = useState(50000)
  const [topK, setTopK] = useState(8)
  const [chunkSize, setChunkSize] = useState(512)
  const [embedding, setEmbedding] = useState(0.13)
  const [llmInput, setLlmInput] = useState(2.50)
  const [llmOutput, setLlmOutput] = useState(10.00)
  const [avgContext, setAvgContext] = useState(1800)
  const [avgOutputTokens, setAvgOutputTokens] = useState(350)
  const [analystHrs, setAnalystHrs] = useState(40)
  const [analystRate, setAnalystRate] = useState(120)
  const [platformSetup, setPlatformSetup] = useState(25000)
  const [drillOpen, setDrillOpen] = useState<string | null>(null)
  const [showSources, setShowSources] = useState(false)
  const [saveName, setSaveName] = useState('')

  // Set arch to first profile once loaded
  useEffect(() => {
    if (profiles.length > 0 && !arch) {
      const first = profiles[0]
      setArch(first.architecture_type)
      setTopK(first.default_top_k)
      setChunkSize(first.default_chunk_size)
      setEmbedding(first.embedding_cost_per_1m)
      setLlmInput(first.llm_input_cost_per_1m)
      setLlmOutput(first.llm_output_cost_per_1m)
    }
  }, [profiles, arch])

  const currentProfile = useMemo(() => (profiles || []).find(p => p.architecture_type === arch), [profiles, arch])

  // ── Calculate via backend ──
  const calcMutation = useMutation({
    mutationFn: calculateCost,
  })

  const triggerCalc = useCallback(() => {
    if (!arch) return
    calcMutation.mutate({
      architecture_type: arch,
      monthly_query_volume: monthly,
      top_k: topK,
      chunk_size: chunkSize,
      embedding_cost_per_1m: embedding,
      llm_input_cost_per_1m: llmInput,
      llm_output_cost_per_1m: llmOutput,
      avg_context_tokens: avgContext,
      avg_output_tokens: avgOutputTokens,
      analyst_hours_saved: analystHrs,
      analyst_hourly_rate: analystRate,
      platform_setup_cost: platformSetup,
    })
  }, [arch, monthly, topK, chunkSize, embedding, llmInput, llmOutput, avgContext, avgOutputTokens, analystHrs, analystRate, platformSetup, calcMutation])

  // Auto-calculate on any input change
  useEffect(() => {
    if (arch) triggerCalc()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arch, monthly, topK, chunkSize, embedding, llmInput, llmOutput, avgContext, avgOutputTokens, analystHrs, analystRate, platformSetup])

  const result: CalculateResponse | null = calcMutation.data ?? null
  const positiveROI = result ? result.annual_savings > 0 : false

  // ── Save scenario ──
  const saveMut = useMutation({
    mutationFn: saveScenario,
    onSuccess: () => {
      success('Scenario saved!')
      setSaveName('')
      qc.invalidateQueries({ queryKey: ['cost-scenarios'] })
    },
    onError: () => toastError('Failed to save scenario'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteScenario,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-scenarios'] }),
  })

  function handleSave() {
    if (!result || !saveName.trim()) return
    saveMut.mutate({
      name: saveName.trim(),
      architecture_type: arch,
      inputs: result.inputs_used,
      results: {
        cost_per_query: result.cost_per_query,
        monthly_cost: result.monthly_cost,
        annual_cost: result.annual_cost,
        annual_savings: result.annual_savings,
        payback_months: result.payback_months,
      },
    })
  }

  function handleArchChange(newArch: string) {
    setArch(newArch)
    const p = profiles.find(pr => pr.architecture_type === newArch)
    if (p) {
      setTopK(p.default_top_k)
      setChunkSize(p.default_chunk_size)
      setEmbedding(p.embedding_cost_per_1m)
      setLlmInput(p.llm_input_cost_per_1m)
      setLlmOutput(p.llm_output_cost_per_1m)
    }
  }

  // ── Drillable metric tile ──
  function MetricTile({ id, label, value, sub, variant, explanation }: {
    id: string; label: string; value: string | number; sub?: string;
    variant?: 'ok' | 'warn' | 'info' | 'positive' | 'negative' | 'warning';
    explanation?: string
  }) {
    const isOpen = drillOpen === id
    return (
      <div className={`cr-metric cr-metric--${variant ?? 'info'} ${isOpen ? 'cr-metric--drilled' : ''}`}
        onClick={() => setDrillOpen(isOpen ? null : id)} role="button" tabIndex={0}>
        <div className="cr-metric-label">{label}</div>
        <div className="cr-metric-value">{value}{sub && <span className="cr-metric-unit"> {sub}</span>}</div>
        <div className="cr-drill-indicator">{isOpen ? '▲' : '▼'} details</div>
        {isOpen && explanation && (
          <div className="cr-drill-panel" onClick={e => e.stopPropagation()}>
            <p className="cr-drill-text">{explanation}</p>
          </div>
        )}
      </div>
    )
  }

  if (profilesQ.isLoading) {
    return (
      <div className="cr-root">
        <div className="cr-header"><h1 className="cr-title">Cost & ROI Calculator</h1></div>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading cost profiles from database…</p>
      </div>
    )
  }

  return (
    <div className="cr-root">
      <div className="cr-header">
        <div>
          <h1 className="cr-title">Cost & ROI Calculator</h1>
          <p className="cr-subtitle">
            All cost parameters are sourced from the database. Click any metric tile to drill into the calculation.
            Benchmark sources are disclosed below.
          </p>
        </div>
        <div className="cr-as-of">
          As of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div className="cr-layout">
        {/* ── Inputs panel ── */}
        <aside className="cr-inputs">
          <h2 className="cr-section-title">Configuration</h2>

          <div className="cr-field">
            <label>Architecture</label>
            <select value={arch} onChange={e => handleArchChange(e.target.value)}>
              {(profiles || []).map(p => (
                <option key={p.architecture_type} value={p.architecture_type}>{p.label}</option>
              ))}
            </select>
          </div>

          {currentProfile && (
            <div className="cr-profile-note">
              <span className="cr-note-label">Profile note:</span> {currentProfile.notes}
            </div>
          )}

          <div className="cr-field">
            <label>Monthly query volume</label>
            <div className="cr-input-row">
              <input type="range" min={1000} max={5000000} step={1000}
                value={monthly} onChange={e => setMonthly(+e.target.value)} />
              <span className="cr-input-value">{fmtK(monthly)}</span>
            </div>
          </div>

          <div className="cr-field">
            <label>Top-K chunks retrieved</label>
            <div className="cr-input-row">
              <input type="range" min={1} max={30} step={1}
                value={topK} onChange={e => setTopK(+e.target.value)} />
              <span className="cr-input-value">{topK}</span>
            </div>
          </div>

          <div className="cr-field">
            <label>Avg chunk size (tokens)</label>
            <div className="cr-input-row">
              <input type="range" min={64} max={2048} step={64}
                value={chunkSize} onChange={e => setChunkSize(+e.target.value)} />
              <span className="cr-input-value">{chunkSize}</span>
            </div>
          </div>

          <h2 className="cr-section-title">Model Costs</h2>

          <div className="cr-field">
            <label>Embedding cost ($/1M tokens)</label>
            <input type="number" step="0.01" min="0" value={embedding}
              onChange={e => setEmbedding(+e.target.value)} className="cr-number-input" />
          </div>

          <div className="cr-field">
            <label>LLM input cost ($/1M tokens)</label>
            <input type="number" step="0.1" min="0" value={llmInput}
              onChange={e => setLlmInput(+e.target.value)} className="cr-number-input" />
          </div>

          <div className="cr-field">
            <label>LLM output cost ($/1M tokens)</label>
            <input type="number" step="0.1" min="0" value={llmOutput}
              onChange={e => setLlmOutput(+e.target.value)} className="cr-number-input" />
          </div>

          <div className="cr-field">
            <label>Avg context tokens / query</label>
            <input type="number" step="100" min="100" value={avgContext}
              onChange={e => setAvgContext(+e.target.value)} className="cr-number-input" />
          </div>

          <div className="cr-field">
            <label>Avg output tokens / query</label>
            <input type="number" step="50" min="50" value={avgOutputTokens}
              onChange={e => setAvgOutputTokens(+e.target.value)} className="cr-number-input" />
          </div>

          <h2 className="cr-section-title">Value Baseline</h2>

          <div className="cr-field">
            <label>Analyst hours saved / month</label>
            <input type="number" step="1" min="0" value={analystHrs}
              onChange={e => setAnalystHrs(+e.target.value)} className="cr-number-input" />
          </div>

          <div className="cr-field">
            <label>Analyst hourly rate ($)</label>
            <input type="number" step="10" min="0" value={analystRate}
              onChange={e => setAnalystRate(+e.target.value)} className="cr-number-input" />
          </div>

          <div className="cr-field">
            <label>One-time setup cost ($)</label>
            <input type="number" step={1000} min="0" value={platformSetup}
              onChange={e => setPlatformSetup(+e.target.value)} className="cr-number-input" />
          </div>

          {/* Save scenario */}
          <h2 className="cr-section-title">Save Scenario</h2>
          <div className="cr-field">
            <input type="text" placeholder="Scenario name…" value={saveName}
              onChange={e => setSaveName(e.target.value)} className="cr-number-input" />
          </div>
          <button className="cr-save-btn" onClick={handleSave}
            disabled={!saveName.trim() || !result || saveMut.isPending}>
            {saveMut.isPending ? 'Saving…' : '💾 Save current calculation'}
          </button>
        </aside>

        {/* ── Results panel ── */}
        <section className="cr-results">
          {result ? (
            <>
              <div className="cr-arch-badge" data-arch={arch}>
                {result.architecture_label}
              </div>

              {/* Drillable KPI tiles */}
              <div className="cr-metrics-grid">
                <MetricTile id="cpq" label="Cost per query" value={fmtUSD(result.cost_per_1k_queries)} sub="/1K queries"
                  variant="info"
                  explanation={`Embedding: ${fmtUSD(result.breakdown.embedding_cost_per_query * 1000)}/1K + LLM input: ${fmtUSD(result.breakdown.llm_input_cost_per_query * 1000)}/1K + LLM output: ${fmtUSD(result.breakdown.llm_output_cost_per_query * 1000)}/1K. Formula: (topK × chunkSize × embeddingRate) + (contextTokens × inputRate) + (outputTokens × outputRate).`} />
                <MetricTile id="mc" label="Monthly infra cost" value={fmtUSD(result.monthly_cost)}
                  variant="info"
                  explanation={`${fmtK(monthly)} queries/month × ${fmtUSD(result.cost_per_query)}/query = ${fmtUSD(result.monthly_cost)}/month. This is the pure compute cost excluding infrastructure (hosting, vector DB, etc.).`} />
                <MetricTile id="ac" label="Annual infra cost" value={fmtUSD(result.annual_cost)}
                  variant="info"
                  explanation={`Monthly cost × 12 = ${fmtUSD(result.monthly_cost)} × 12 = ${fmtUSD(result.annual_cost)}.`} />
                <MetricTile id="ns" label="Annual net savings" value={`${positiveROI ? '+' : ''}${fmtUSD(result.annual_savings)}`}
                  variant={positiveROI ? 'positive' : 'negative'}
                  explanation={`Manual cost: ${fmtUSD(result.manual_monthly)}/mo × 12 = ${fmtUSD(result.manual_monthly * 12)}/yr. Minus annual infra: ${fmtUSD(result.annual_cost)} = ${fmtUSD(result.annual_savings)} savings.`} />
                <MetricTile id="lat" label="Estimated latency" value={`${result.latency_estimate_ms}`} sub="ms"
                  variant="info"
                  explanation={currentProfile?.latency_source ?? 'No source available.'} />
                <MetricTile id="pb" label="Payback period"
                  value={result.payback_months != null ? `${result.payback_months} mo` : 'N/A'}
                  variant={positiveROI ? 'positive' : 'warning'}
                  explanation={`Setup cost: ${fmtUSD(platformSetup)}. Monthly net savings: ${fmtUSD(result.manual_monthly - result.monthly_cost)}. Payback = setup / monthly net = ${result.payback_months ?? 'N/A'} months.`} />
              </div>

              {/* Cost breakdown */}
              <div className="cr-breakdown">
                <h3>Cost breakdown per query</h3>
                <div className="cr-breakdown-bar">
                  <div className="cr-bar-seg cr-bar-seg--embedding"
                    style={{ width: `${result.breakdown.embedding_pct}%` }}
                    title={`Embedding: ${fmtUSD(result.breakdown.embedding_cost_per_query * 1000)} /1K`} />
                  <div className="cr-bar-seg cr-bar-seg--llm-input"
                    style={{ width: `${result.breakdown.llm_input_pct}%` }}
                    title={`LLM input: ${fmtUSD(result.breakdown.llm_input_cost_per_query * 1000)} /1K`} />
                  <div className="cr-bar-seg cr-bar-seg--llm-output"
                    style={{ width: `${result.breakdown.llm_output_pct}%` }}
                    title={`LLM output: ${fmtUSD(result.breakdown.llm_output_cost_per_query * 1000)} /1K`} />
                </div>
                <div className="cr-breakdown-legend">
                  <span><span className="cr-legend-dot cr-legend-dot--embedding"/>Embedding ({result.breakdown.embedding_pct}%)</span>
                  <span><span className="cr-legend-dot cr-legend-dot--llm-input"/>LLM input ({result.breakdown.llm_input_pct}%)</span>
                  <span><span className="cr-legend-dot cr-legend-dot--llm-output"/>LLM output ({result.breakdown.llm_output_pct}%)</span>
                </div>
              </div>

              {/* ROI narrative */}
              <div className={`cr-roi-card ${positiveROI ? 'cr-roi-card--positive' : 'cr-roi-card--negative'}`}>
                <div className="cr-roi-icon">{positiveROI ? '📈' : '⚠️'}</div>
                <div>
                  <div className="cr-roi-title">
                    {positiveROI
                      ? `Positive ROI — payback in ${result.payback_months} month${result.payback_months === 1 ? '' : 's'}`
                      : 'Infra cost exceeds current manual baseline'}
                  </div>
                  <p className="cr-roi-body">{result.explanation.methodology}</p>
                </div>
              </div>

              {/* Architecture comparison */}
              <div className="cr-compare">
                <h3>Architecture comparison at {fmtK(monthly)} queries/month</h3>
                <table className="cr-compare-table">
                  <thead>
                    <tr>
                      <th>Architecture</th>
                      <th>Latency</th>
                      <th>Default Top-K</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(profiles || []).map(p => {
                      const isCurrent = p.architecture_type === arch
                      return (
                        <tr key={p.architecture_type} className={isCurrent ? 'cr-compare-current' : ''}
                          onClick={() => handleArchChange(p.architecture_type)} style={{ cursor: 'pointer' }}>
                          <td>{p.label}{isCurrent && <span className="cr-compare-selected"> ◀ selected</span>}</td>
                          <td>{p.latency_estimate_ms} ms</td>
                          <td>{p.default_top_k}</td>
                          <td className="cr-compare-notes">{p.notes}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Methodology + Assumptions */}
              <div className="cr-explain-section">
                <h3>Calculation Methodology</h3>
                <p className="cr-explain-text">{result.explanation.methodology}</p>

                <h4>Assumptions</h4>
                <ul className="cr-explain-list">
                  {(result.explanation.assumptions || []).map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>

              {/* Benchmark Sources Disclosure */}
              <div className="cr-sources-section">
                <button className="cr-sources-toggle" onClick={() => setShowSources(s => !s)}>
                  {showSources ? '▼' : '▶'} Benchmark Data Sources ({result.explanation.benchmark_sources.length})
                </button>
                {showSources && (
                  <div className="cr-sources-list">
                    <p className="cr-sources-disclaimer">
                      Cost estimates and latency figures are derived from the following benchmarks and pricing pages.
                      These sources are indicative and may not reflect your specific deployment.
                    </p>
                    <table className="cr-sources-table">
                      <thead>
                        <tr><th>Source</th><th>URL</th><th>Date</th></tr>
                      </thead>
                      <tbody>
                        {(result.explanation.benchmark_sources || []).map((s, i) => (
                          <tr key={i}>
                            <td>{s.name}</td>
                            <td><a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a></td>
                            <td>{s.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="cr-loading-results">
              <p>Select an architecture to see cost analysis.</p>
            </div>
          )}

          {/* Saved scenarios */}
          {savedScenarios.length > 0 && (
            <div className="cr-scenarios-section">
              <h3>Saved Scenarios</h3>
              <div className="cr-scenarios-list">
                {(savedScenarios || []).map(s => (
                  <div key={s.id} className="cr-scenario-card">
                    <div className="cr-scenario-header">
                      <strong>{s.name}</strong>
                      <span className="cr-scenario-arch">{s.architecture_type}</span>
                    </div>
                    <div className="cr-scenario-meta">
                      Monthly: {fmtUSD((s.results as Record<string, number>).monthly_cost ?? 0)} ·
                      Savings: {fmtUSD((s.results as Record<string, number>).annual_savings ?? 0)}/yr
                    </div>
                    <button className="cr-scenario-delete" onClick={() => deleteMut.mutate(s.id)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
