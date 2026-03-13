const PALETTE_GROUPS: { label: string; types: string[] }[] = [
  { label: 'Input & routing', types: ['input_query', 'query_classifier', 'intent_detector', 'guardrail', 'fallback_route'] },
  { label: 'Retrieval', types: ['embedding_generator', 'vector_retriever', 'lexical_retriever', 'metadata_filter', 'graph_retriever', 'temporal_filter'] },
  { label: 'Processing', types: ['reranker', 'context_assembler', 'prompt_constructor'] },
  { label: 'Output', types: ['llm_answer_generator', 'source_citation_builder', 'output_formatter'] },
]

export function NodePalette() {
  return (
    <div className="wf-palette">
      <h2>Nodes</h2>
      {PALETTE_GROUPS.map((group) => (
        <div key={group.label} className="wf-palette-group">
          <h3>{group.label}</h3>
          <ul>
            {group.types.map((type) => (
              <li key={type} className="wf-palette-item">
                {type.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

