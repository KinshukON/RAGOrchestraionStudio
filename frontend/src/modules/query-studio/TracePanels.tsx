import type { WorkflowSimulationTrace } from '../../api/queryStudio'

type Props = {
  trace: WorkflowSimulationTrace
  /** When true, show a note that trace data is simulated. */
  showSimulatedLabel?: boolean
}

export function TracePanels({ trace, showSimulatedLabel = false }: Props) {
  return (
    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
      {showSimulatedLabel && (
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.7rem', color: '#9ca3af' }}>
          Simulated trace — not from real retrieval or LLM.
        </p>
      )}
      <details open>
        <summary>Retrieval path / timeline</summary>
        <ol style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem' }}>
          {trace.retrieval_path.length === 0 ? (
            <li>No steps (stub)</li>
          ) : (
            trace.retrieval_path.map((step) => (
              <li key={step}>{step}</li>
            ))
          )}
        </ol>
      </details>

      <details>
        <summary>Sources</summary>
        <p style={{ margin: '0.25rem 0 0' }}>
          {trace.retrieved_sources.length} retrieved sources (vector, lexical, graph, etc.)
          {trace.retrieved_sources.length === 0 && ' — simulated.'}
        </p>
      </details>

      <details>
        <summary>Graph traversal</summary>
        <p style={{ margin: '0.25rem 0 0' }}>
          {trace.graph_traversal.length} graph hop(s).
          {trace.graph_traversal.length === 0 && ' Simulated.'}
        </p>
      </details>

      <details>
        <summary>Temporal filters</summary>
        <p style={{ margin: '0.25rem 0 0' }}>
          {trace.temporal_filters.length} temporal constraint(s).
          {trace.temporal_filters.length === 0 && ' Simulated.'}
        </p>
      </details>
    </div>
  )
}

