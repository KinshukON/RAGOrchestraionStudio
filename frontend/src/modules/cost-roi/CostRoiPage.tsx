import { useState } from 'react'
import './cost-roi.css'

// ── Types ────────────────────────────────────────────────────────────────
interface ArchInputs {
  archType: string
  monthlyQueryVolume: number
  avgChunkSize: number          // tokens
  topK: number
  embeddingCostPer1MTokens: number   // $/1M tokens
  llmInputCostPer1MTokens: number
  llmOutputCostPer1MTokens: number
  avgInputTokens: number             // tokens per query (context)
  avgOutputTokens: number
}

interface ArchDefault extends Partial<Omit<ArchInputs, 'archType'>> {
  latencyEstMs?: number
}

const ARCH_DEFAULTS: Record<string, ArchDefault> = {
  vector:     { topK: 8,  avgChunkSize: 512, latencyEstMs: 380 },
  vectorless: { topK: 10, avgChunkSize: 256, latencyEstMs: 120 },
  graph:      { topK: 5,  avgChunkSize: 768, latencyEstMs: 900 },
  temporal:   { topK: 8,  avgChunkSize: 512, latencyEstMs: 450 },
  hybrid:     { topK: 12, avgChunkSize: 512, latencyEstMs: 620 },
  custom:     { topK: 8,  avgChunkSize: 512, latencyEstMs: 500 },
}


const ARCH_LABELS: Record<string, string> = {
  vector: 'Vector RAG', vectorless: 'Vectorless RAG', graph: 'Graph RAG',
  temporal: 'Temporal RAG', hybrid: 'Hybrid RAG', custom: 'Custom RAG',
}

function fmtUSD(n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtK(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toString() }

export function CostRoiPage() {
  const [arch, setArch] = useState('vector')
  const [monthly, setMonthly] = useState(50000)
  const [embedding, setEmbedding] = useState(0.13)      // $/1M tokens (text-embedding-3-small)
  const [llmInput, setLlmInput] = useState(2.50)        // $/1M tokens (GPT-4o)
  const [llmOutput, setLlmOutput] = useState(10.00)
  const [avgContext, setAvgContext] = useState(1800)     // tokens per query
  const [avgOutput, setAvgOutput] = useState(350)
  const [analystHrs, setAnalystHrs] = useState(40)      // manual lookup hrs/month
  const [analystRate, setAnalystRate] = useState(120)   // $/hr
  const [platformSetup, setPlatformSetup] = useState(25000) // one-time setup cost
  const [topK, setTopK] = useState(ARCH_DEFAULTS[arch]?.topK ?? 8)
  const [chunkSize, setChunkSize] = useState(ARCH_DEFAULTS[arch]?.avgChunkSize ?? 512)

  // Latency estimate (ms) — derived from arch
  const latencyMs = (ARCH_DEFAULTS[arch] as { latencyEstMs?: number })?.latencyEstMs ?? 500

  // ── Cost computation ────────────────────────────────────────────────
  const retrievalTokensPerQuery = topK * chunkSize
  const embeddingCostPerQuery = (retrievalTokensPerQuery / 1_000_000) * embedding
  const llmInputCostPerQuery = (avgContext / 1_000_000) * llmInput
  const llmOutputCostPerQuery = (avgOutput / 1_000_000) * llmOutput
  const costPerQuery = embeddingCostPerQuery + llmInputCostPerQuery + llmOutputCostPerQuery
  const monthlyCost = costPerQuery * monthly
  const annualCost = monthlyCost * 12

  const manualMonthly = analystHrs * analystRate
  const manualAnnual = manualMonthly * 12
  const annualSavings = manualAnnual - annualCost
  const paybackMonths = annualSavings > 0 ? Math.ceil(((platformSetup + annualCost / 12) / (manualMonthly - monthlyCost))) : Infinity

  const positiveROI = annualSavings > 0

  return (
    <div className="cr-root">
      <div className="cr-header">
        <h1 className="cr-title">Cost &amp; ROI Calculator</h1>
        <p className="cr-subtitle">
          Estimate the cost of running your RAG architecture and compare it against the value it delivers.
          All figures are indicative — adjust inputs to match your actual usage.
        </p>
      </div>

      <div className="cr-layout">
        {/* ── Inputs panel ── */}
        <aside className="cr-inputs">
          <h2 className="cr-section-title">Configuration</h2>

          <div className="cr-field">
            <label>Architecture</label>
            <select value={arch} onChange={e => {
              const a = e.target.value
              setArch(a)
              setTopK(ARCH_DEFAULTS[a]?.topK ?? 8)
              setChunkSize(ARCH_DEFAULTS[a]?.avgChunkSize ?? 512)
            }}>
              {Object.entries(ARCH_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

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
            <input type="number" step="50" min="50" value={avgOutput}
              onChange={e => setAvgOutput(+e.target.value)} className="cr-number-input" />
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
        </aside>

        {/* ── Results panel ── */}
        <section className="cr-results">
          <div className="cr-arch-badge" data-arch={arch}>
            {ARCH_LABELS[arch]}
          </div>

          {/* Key metrics */}
          <div className="cr-metrics-grid">
            <div className="cr-metric">
              <div className="cr-metric-label">Cost per query</div>
              <div className="cr-metric-value">{fmtUSD(costPerQuery * 1000)}<span className="cr-metric-unit"> /1K queries</span></div>
            </div>
            <div className="cr-metric">
              <div className="cr-metric-label">Monthly infra cost</div>
              <div className="cr-metric-value">{fmtUSD(monthlyCost)}</div>
            </div>
            <div className="cr-metric">
              <div className="cr-metric-label">Annual infra cost</div>
              <div className="cr-metric-value">{fmtUSD(annualCost)}</div>
            </div>
            <div className={`cr-metric ${positiveROI ? 'cr-metric--positive' : 'cr-metric--negative'}`}>
              <div className="cr-metric-label">Annual net savings</div>
              <div className="cr-metric-value">{positiveROI ? '+' : ''}{fmtUSD(annualSavings)}</div>
            </div>
            <div className="cr-metric">
              <div className="cr-metric-label">Estimated latency</div>
              <div className="cr-metric-value">{latencyMs}<span className="cr-metric-unit"> ms</span></div>
            </div>
            <div className={`cr-metric ${positiveROI ? 'cr-metric--positive' : 'cr-metric--warning'}`}>
              <div className="cr-metric-label">Payback period</div>
              <div className="cr-metric-value">
                {paybackMonths === Infinity ? 'N/A' : `${paybackMonths} mo`}
              </div>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="cr-breakdown">
            <h3>Cost breakdown per query</h3>
            <div className="cr-breakdown-bar">
              <div className="cr-bar-seg cr-bar-seg--embedding"
                style={{ width: `${(embeddingCostPerQuery / costPerQuery * 100).toFixed(1)}%` }}
                title={`Embedding: ${fmtUSD(embeddingCostPerQuery * 1000)} /1K`} />
              <div className="cr-bar-seg cr-bar-seg--llm-input"
                style={{ width: `${(llmInputCostPerQuery / costPerQuery * 100).toFixed(1)}%` }}
                title={`LLM input: ${fmtUSD(llmInputCostPerQuery * 1000)} /1K`} />
              <div className="cr-bar-seg cr-bar-seg--llm-output"
                style={{ width: `${(llmOutputCostPerQuery / costPerQuery * 100).toFixed(1)}%` }}
                title={`LLM output: ${fmtUSD(llmOutputCostPerQuery * 1000)} /1K`} />
            </div>
            <div className="cr-breakdown-legend">
              <span><span className="cr-legend-dot cr-legend-dot--embedding"/>Embedding ({(embeddingCostPerQuery / costPerQuery * 100).toFixed(0)}%)</span>
              <span><span className="cr-legend-dot cr-legend-dot--llm-input"/>LLM input ({(llmInputCostPerQuery / costPerQuery * 100).toFixed(0)}%)</span>
              <span><span className="cr-legend-dot cr-legend-dot--llm-output"/>LLM output ({(llmOutputCostPerQuery / costPerQuery * 100).toFixed(0)}%)</span>
            </div>
          </div>

          {/* ROI narrative */}
          <div className={`cr-roi-card ${positiveROI ? 'cr-roi-card--positive' : 'cr-roi-card--negative'}`}>
            <div className="cr-roi-icon">{positiveROI ? '📈' : '⚠️'}</div>
            <div>
              <div className="cr-roi-title">
                {positiveROI
                  ? `Positive ROI — payback in ${paybackMonths} month${paybackMonths === 1 ? '' : 's'}`
                  : 'Infra cost exceeds current manual baseline'}
              </div>
              <p className="cr-roi-body">
                {positiveROI
                  ? `At ${fmtK(monthly)} queries/month, ${ARCH_LABELS[arch]} costs ${fmtUSD(monthlyCost)}/month vs ${fmtUSD(manualMonthly)}/month in analyst time — saving ${fmtUSD(annualSavings)} annually after the ${fmtUSD(platformSetup)} setup investment.`
                  : `Analyst time savings (${fmtUSD(manualMonthly)}/mo) are less than infra cost (${fmtUSD(monthlyCost)}/mo). Increase query volume or reduce per-query cost to reach ROI.`}
              </p>
            </div>
          </div>

          {/* Architecture comparison table */}
          <div className="cr-compare">
            <h3>Architecture comparison at {fmtK(monthly)} queries/month</h3>
            <table className="cr-compare-table">
              <thead>
                <tr>
                  <th>Architecture</th>
                  <th>Est. monthly cost</th>
                  <th>Latency</th>
                  <th>Relative cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(ARCH_LABELS).map(([a, label]) => {
                  const d = ARCH_DEFAULTS[a] as { topK?: number; avgChunkSize?: number; latencyEstMs?: number }
                  const arcK = d?.topK ?? 8
                  const arcChunk = d?.avgChunkSize ?? 512
                  const arcLatency = d?.latencyEstMs ?? 500
                  const arcEmbed = (arcK * arcChunk / 1_000_000) * embedding
                  const arcIn = (avgContext / 1_000_000) * llmInput
                  const arcOut = (avgOutput / 1_000_000) * llmOutput
                  const arcMonth = (arcEmbed + arcIn + arcOut) * monthly
                  const isCurrent = a === arch
                  return (
                    <tr key={a} className={isCurrent ? 'cr-compare-current' : ''}>
                      <td>{label}{isCurrent && <span className="cr-compare-selected"> ◀ selected</span>}</td>
                      <td>{fmtUSD(arcMonth)}</td>
                      <td>{arcLatency} ms</td>
                      <td>
                        <div className="cr-compare-bar-wrap">
                          <div className="cr-compare-bar"
                            style={{ width: `${Math.min(100, arcMonth / (Math.max(...Object.keys(ARCH_DEFAULTS).map(ak => {
                              const dd = ARCH_DEFAULTS[ak] as { topK?: number; avgChunkSize?: number }
                              return ((dd?.topK ?? 8) * (dd?.avgChunkSize ?? 512) / 1_000_000 * embedding + avgContext / 1_000_000 * llmInput + avgOutput / 1_000_000 * llmOutput) * monthly
                            }))) * 100).toFixed(1)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
