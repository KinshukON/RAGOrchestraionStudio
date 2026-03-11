const NODE_TYPES = [
  'input_query',
  'query_classifier',
  'vector_retriever',
  'lexical_retriever',
  'graph_retriever',
  'temporal_filter',
  'reranker',
  'llm_answer_generator',
] as const

export function NodePalette() {
  return (
    <div className="wf-palette">
      <h2>Nodes</h2>
      <ul>
        {NODE_TYPES.map((type) => (
          <li key={type} className="wf-palette-item">
            {type}
          </li>
        ))}
      </ul>
    </div>
  )
}

