import type { StrategyTrace, WorkflowSimulationTrace } from '../../api/queryStudio'
import { TracePanels } from '../query-studio/TracePanels'
import './query-lab.css'

type ResultComparisonGridProps = {
  results: StrategyTrace[]
  onSaveAsTestCase?: (strategyId: string, trace: WorkflowSimulationTrace) => void
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
              <span className="ql-badge ql-badge--simulated">Simulated</span>
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
                <span className="ql-metric-label">Token usage / cost</span>
                <span className="ql-metric-value">Simulated — not from real model</span>
              </div>
            </div>
            <TracePanels trace={trace} showSimulatedLabel />
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
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
