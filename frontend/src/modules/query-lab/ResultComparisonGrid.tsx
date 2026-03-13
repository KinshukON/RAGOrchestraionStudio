import type { StrategyRunResult, RAGRunResponse } from '../../api/workflows'
import { TracePanels } from '../query-studio/TracePanels'
import './query-lab.css'

type ResultComparisonGridProps = {
  results: StrategyRunResult[]
  onSaveAsTestCase?: (strategyId: string, trace: RAGRunResponse) => void
}

export function ResultComparisonGrid({ results, onSaveAsTestCase }: ResultComparisonGridProps) {
  return (
    <section className="ql-panel ql-results-panel">
      <h2>Comparison</h2>
      <div className="ql-comparison-grid">
        {results.map(({ strategy_id, trace }) => (
          <article key={strategy_id} className="ql-result-card">
            <div className="ql-result-card-header">
              <h3>{strategy_id}</h3>
              {trace.is_simulated
                ? <span className="ql-badge ql-badge--simulated">Simulated</span>
                : <span className="ql-badge ql-badge--live">Live · {trace.model_used}</span>
              }
            </div>
            <div className="ql-result-metrics">
              <div className="ql-metric">
                <span className="ql-metric-label">Answer</span>
                <p className="ql-metric-value ql-answer">{trace.model_answer}</p>
              </div>
              <div className="ql-metrics-row">
                <div className="ql-metric">
                  <span className="ql-metric-label">Latency</span>
                  <span className="ql-metric-value">{trace.latency_ms} ms</span>
                </div>
                <div className="ql-metric">
                  <span className="ql-metric-label">Confidence</span>
                  <span className="ql-metric-value">{Math.round(trace.confidence_score * 100)}%</span>
                </div>
                <div className="ql-metric">
                  <span className="ql-metric-label">Hallucination risk</span>
                  <span className="ql-metric-value">{trace.hallucination_risk}</span>
                </div>
              </div>
              <div className="ql-metric ql-metric--hint">
                <span className="ql-metric-label">Tokens</span>
                <span className="ql-metric-value">
                  {trace.is_simulated
                    ? 'Simulated — connect API key for real tokens'
                    : `↑${trace.input_tokens} in · ↓${trace.output_tokens} out`
                  }
                </span>
              </div>
            </div>
            <TracePanels trace={trace as never} showSimulatedLabel={trace.is_simulated ?? true} />
            <div className="ql-result-actions">
              {onSaveAsTestCase && (
                <button
                  type="button"
                  className="ql-btn ql-btn--secondary ql-btn--small"
                  onClick={() => onSaveAsTestCase(strategy_id, trace)}
                >
                  Save as test case
                </button>
              )}
              {trace.grounded_citations && trace.grounded_citations.length > 0 && (
                <details className="ql-citations">
                  <summary className="ql-btn ql-btn--ghost ql-btn--small">Sources ({trace.grounded_citations.length})</summary>
                  <ul className="ql-source-list">
                    {trace.grounded_citations.map((c, i) => (
                      <li key={i}>{String((c as Record<string, unknown>).source ?? c)}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
