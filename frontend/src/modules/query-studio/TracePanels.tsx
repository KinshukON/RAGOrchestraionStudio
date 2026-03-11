import type { WorkflowSimulationTrace } from '../../api/queryStudio'

type Props = {
  trace: WorkflowSimulationTrace
}

export function TracePanels({ trace }: Props) {
  return (
    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
      <details open>
        <summary>Timeline</summary>
        <ol>
          {trace.retrieval_path.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </details>

      <details>
        <summary>Sources</summary>
        <p>{trace.retrieved_sources.length} sources (vector, lexical, graph, etc.)</p>
      </details>

      <details>
        <summary>Graph traversal</summary>
        <p>{trace.graph_traversal.length} graph hops (stub data).</p>
      </details>

      <details>
        <summary>Temporal filters</summary>
        <p>{trace.temporal_filters.length} temporal constraints (stub data).</p>
      </details>
    </div>
  )
}

