import type { VectorRagConfig } from './designerTypes'

type Props = {
  value: VectorRagConfig
  onChange: (next: VectorRagConfig) => void
}

export function VectorDesignerStepGroups({ value, onChange }: Props) {
  function update<K extends keyof VectorRagConfig>(key: K, nextValue: VectorRagConfig[K]) {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className="designer-grid">
      <section>
        <h2>Data &amp; indexing</h2>
        <label className="designer-field">
          <span>Data source type</span>
          <input
            value={value.dataSourceType}
            onChange={e => update('dataSourceType', e.target.value)}
            placeholder="File store, SQL, data warehouse…"
          />
        </label>
        <label className="designer-field">
          <span>Chunking strategy</span>
          <input
            value={value.chunkingStrategy}
            onChange={e => update('chunkingStrategy', e.target.value)}
            placeholder="semantic, fixed, section-aware…"
          />
        </label>
        <label className="designer-field">
          <span>Embedding model</span>
          <input
            value={value.embeddingModel}
            onChange={e => update('embeddingModel', e.target.value)}
            placeholder="e.g. text-embedding-3-large"
          />
        </label>
        <label className="designer-field">
          <span>Vector database</span>
          <input
            value={value.vectorDatabase}
            onChange={e => update('vectorDatabase', e.target.value)}
            placeholder="pgvector, Pinecone, Weaviate…"
          />
        </label>
      </section>
      <section>
        <h2>Retrieval &amp; ranking</h2>
        <label className="designer-field">
          <span>Similarity metric</span>
          <input
            value={value.similarityMetric}
            onChange={e => update('similarityMetric', e.target.value)}
            placeholder="cosine, dot_product…"
          />
        </label>
        <label className="designer-field">
          <span>Top K</span>
          <input
            type="number"
            min={1}
            value={value.topK}
            onChange={e => update('topK', Number(e.target.value) || 1)}
          />
        </label>
        <label className="designer-field">
          <span>Metadata filters</span>
          <input
            value={value.metadataFilters}
            onChange={e => update('metadataFilters', e.target.value)}
            placeholder="JSON or DSL describing filters"
          />
        </label>
        <label className="designer-field">
          <span>Reranker</span>
          <input
            value={value.reranker}
            onChange={e => update('reranker', e.target.value)}
            placeholder="cross-encoder model or SaaS reranker"
          />
        </label>
      </section>
      <section>
        <h2>Answer generation &amp; fallback</h2>
        <label className="designer-field">
          <span>Answer generation model</span>
          <input
            value={value.answerModel}
            onChange={e => update('answerModel', e.target.value)}
            placeholder="chat model used for final answer"
          />
        </label>
        <label className="designer-field">
          <span>Fallback strategy</span>
          <input
            value={value.fallbackStrategy}
            onChange={e => update('fallbackStrategy', e.target.value)}
            placeholder="e.g. fall back to direct LLM, alternate retriever…"
          />
        </label>
      </section>
    </div>
  )
}

