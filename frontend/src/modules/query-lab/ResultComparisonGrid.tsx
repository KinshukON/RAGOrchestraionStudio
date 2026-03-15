import { useState } from 'react'
import type { StrategyRunResult, RAGRunResponse } from '../../api/workflows'
import './query-lab.css'

// ── Helpers ────────────────────────────────────────────────────────────────

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => { })
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const STRATEGY_COLORS: Record<string, string> = {
  vector: '#818cf8',
  vectorless: '#38bdf8',
  graph: '#34d399',
  temporal: '#fb923c',
  hybrid: '#a78bfa',
}

// ── Latency span bar chart ──────────────────────────────────────────────────
function SpanChart({ spans }: { spans: RAGRunResponse['spans'] }) {
  if (!spans || spans.length === 0) return null
  const maxMs = Math.max(...spans.map(s => s.latency_ms as number), 1)
  return (
    <div className="ql-span-chart">
      <span className="ql-span-chart-title">Stage latency</span>
      {spans.map((span, i) => {
        const pct = Math.round(((span.latency_ms as number) / maxMs) * 100)
        return (
          <div key={i} className="ql-span-row">
            <span className="ql-span-label">{String(span.step)}</span>
            <div className="ql-span-bar-track">
              <div
                className="ql-span-bar-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="ql-span-ms">{span.latency_ms as number} ms</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Retrieved chunks panel ──────────────────────────────────────────────────
function ChunksPanel({ chunks }: { chunks: RAGRunResponse['retrieved_sources'] }) {
  if (!chunks || chunks.length === 0) return null
  return (
    <details className="ql-chunks-panel">
      <summary className="ql-chunks-summary">
        📄 Retrieved evidence ({chunks.length} chunks)
      </summary>
      <div className="ql-chunks-list">
        {chunks.map((c, i) => {
          const chunk = c as Record<string, unknown>
          return (
            <div key={i} className="ql-chunk-item">
              <div className="ql-chunk-header">
                <span className="ql-chunk-rank">#{chunk.rank as number}</span>
                <span className="ql-chunk-title">{chunk.title as string}</span>
                <span className="ql-chunk-score">score: {(chunk.score as number)?.toFixed(3)}</span>
                <span className="ql-chunk-badge">{chunk.source_type as string}</span>
              </div>
              <p className="ql-chunk-snippet">{(chunk.snippet as string)?.slice(0, 220)}…</p>
              <div className="ql-chunk-meta">
                {chunk.author as string} · {chunk.year as number}
              </div>
            </div>
          )
        })}
      </div>
    </details>
  )
}

// ── Retrieval path pills ────────────────────────────────────────────────────
function RetrievalPath({ path }: { path: string[] }) {
  if (!path || path.length === 0) return null
  return (
    <div className="ql-retrieval-path">
      <span className="ql-metric-label">Retrieval path</span>
      <div className="ql-path-pills">
        {path.map((step, i) => (
          <span key={i} className="ql-path-pill">
            {step}
            {i < path.length - 1 && <span className="ql-path-arrow">→</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Strategy card ───────────────────────────────────────────────────────────
function StrategyCard({
  strategy_id,
  trace,
  onSave,
}: {
  strategy_id: string
  trace: RAGRunResponse
  onSave?: (sid: string, trace: RAGRunResponse) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const accent = STRATEGY_COLORS[strategy_id] ?? '#818cf8'
  const extTrace = trace as RAGRunResponse & {
    experiment_id?: string
    chunks_retrieved?: number
    rerank_latency_ms?: number
    llm_latency_ms?: number
    filters_applied?: string[]
  }

  return (
    <article className="ql-result-card" style={{ borderTopColor: accent }}>
      {/* ── Header ── */}
      <div className="ql-result-card-header">
        <div className="ql-card-title-row">
          <h3 style={{ color: accent }}>{strategy_id}</h3>
          <div className="ql-card-badges">
            {extTrace.experiment_id && (
              <button
                className="ql-exp-id"
                title="Click to copy experiment ID"
                onClick={() => copyText(extTrace.experiment_id!)}
              >
                {extTrace.experiment_id}
              </button>
            )}
            {trace.is_simulated
              ? <span className="ql-badge ql-badge--simulated">Simulated</span>
              : <span className="ql-badge ql-badge--live">Live · {trace.model_used}</span>
            }
          </div>
        </div>
        <p className="ql-card-subtitle">
          {extTrace.chunks_retrieved ?? trace.retrieved_sources?.length ?? 0} chunks
          · {trace.input_tokens} tokens in
          · {trace.output_tokens} tokens out
        </p>
      </div>

      {/* ── Answer ── */}
      <div className="ql-result-answer">
        <span className="ql-metric-label">Answer</span>
        <p className="ql-answer-text">{trace.model_answer}</p>
      </div>

      {/* ── Key metrics row ── */}
      <div className="ql-metrics-row">
        <div className="ql-metric">
          <span className="ql-metric-label">Total latency</span>
          <span className="ql-metric-value ql-metric-value--accent">{trace.latency_ms} ms</span>
        </div>
        <div className="ql-metric">
          <span className="ql-metric-label">LLM time</span>
          <span className="ql-metric-value">{extTrace.llm_latency_ms ?? '—'} ms</span>
        </div>
        <div className="ql-metric">
          <span className="ql-metric-label">Rerank time</span>
          <span className="ql-metric-value">{extTrace.rerank_latency_ms ?? '—'} ms</span>
        </div>
        <div className="ql-metric">
          <span className="ql-metric-label">Confidence</span>
          <span className="ql-metric-value">{Math.round(trace.confidence_score * 100)}%</span>
        </div>
        <div className="ql-metric">
          <span className="ql-metric-label">Hallucination risk</span>
          <span className={`ql-metric-value ql-risk--${trace.hallucination_risk?.replace(' ', '-')}`}>
            {trace.hallucination_risk}
          </span>
        </div>
        <div className="ql-metric">
          <span className="ql-metric-label">Model</span>
          <span className="ql-metric-value ql-metric-value--muted">{trace.model_used}</span>
        </div>
      </div>

      {/* ── Filters applied ── */}
      {extTrace.filters_applied && extTrace.filters_applied.length > 0 && (
        <div className="ql-filters-applied">
          <span className="ql-metric-label">Filters applied</span>
          <ul className="ql-filter-list">
            {extTrace.filters_applied.map((f, i) => (
              <li key={i} className="ql-filter-item">{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Retrieval path ── */}
      <RetrievalPath path={trace.retrieval_path ?? []} />

      {/* ── Stage latency chart ── */}
      <SpanChart spans={trace.spans ?? []} />

      {/* ── Retrieved chunks ── */}
      <ChunksPanel chunks={trace.retrieved_sources ?? []} />

      {/* ── Citations ── */}
      {trace.grounded_citations && trace.grounded_citations.length > 0 && (
        <details className="ql-citations">
          <summary className="ql-btn ql-btn--ghost ql-btn--small">
            Sources ({trace.grounded_citations.length})
          </summary>
          <ul className="ql-source-list">
            {trace.grounded_citations.map((c, i) => {
              const cit = c as Record<string, unknown>
              return (
                <li key={i}>
                  <strong>{cit.source as string}</strong>
                  {cit.score !== undefined && ` (score: ${(cit.score as number).toFixed(3)})`}
                </li>
              )
            })}
          </ul>
        </details>
      )}

      {/* ── Actions ── */}
      <div className="ql-result-actions">
        {onSave && (
          <button
            type="button"
            className="ql-btn ql-btn--secondary ql-btn--small"
            onClick={() => onSave(strategy_id, trace)}
          >
            Save as test case
          </button>
        )}
        <button
          type="button"
          className="ql-btn ql-btn--ghost ql-btn--small"
          onClick={() => downloadJson(
            { strategy_id, trace, exported_at: new Date().toISOString() },
            `${extTrace.experiment_id ?? 'run'}-${strategy_id}.json`
          )}
        >
          ↓ Export JSON
        </button>
        <button
          type="button"
          className="ql-btn ql-btn--ghost ql-btn--small"
          onClick={() => setExpanded(x => !x)}
        >
          {expanded ? 'Hide' : 'Show'} raw trace
        </button>
      </div>

      {expanded && (
        <pre className="ql-raw-trace">{JSON.stringify(trace, null, 2)}</pre>
      )}
    </article>
  )
}

// ── Main export ─────────────────────────────────────────────────────────────
type Props = {
  results: StrategyRunResult[]
  experimentId?: string
  onSaveAsTestCase?: (strategyId: string, trace: RAGRunResponse) => void
}

export function ResultComparisonGrid({ results, experimentId, onSaveAsTestCase }: Props) {
  if (results.length === 0) return null

  function exportAllStrategies() {
    downloadJson(
      { experiment_id: experimentId, results, exported_at: new Date().toISOString() },
      `${experimentId ?? 'experiment'}-all-strategies.json`
    )
  }

  return (
    <section className="ql-panel ql-results-panel">
      <div className="ql-results-header">
        <h2>Comparison — {results.length} strategies</h2>
        <div className="ql-results-header-actions">
          {experimentId && (
            <span className="ql-exp-id-label" title={experimentId}>
              Experiment: <strong>{experimentId}</strong>
            </span>
          )}
          <button
            type="button"
            className="ql-btn ql-btn--secondary ql-btn--small"
            onClick={exportAllStrategies}
          >
            ↓ Export all strategies (JSON)
          </button>
        </div>
      </div>
      <div className="ql-comparison-grid">
        {results.map(({ strategy_id, trace }) => (
          <StrategyCard
            key={strategy_id}
            strategy_id={strategy_id}
            trace={trace as RAGRunResponse}
            onSave={onSaveAsTestCase}
          />
        ))}
      </div>
    </section>
  )
}
