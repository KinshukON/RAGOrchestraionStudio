import type { VectorlessRagConfig } from './designerTypes'

type Props = {
  value: VectorlessRagConfig
  onChange: (next: VectorlessRagConfig) => void
}

export function VectorlessDesignerStepGroups({ value, onChange }: Props) {
  function update<K extends keyof VectorlessRagConfig>(key: K, nextValue: VectorlessRagConfig[K]) {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className="designer-grid">
      <section>
        <h2>Parsing &amp; structure</h2>
        <label className="designer-field">
          <span>Document parsing strategy</span>
          <input
            value={value.documentParsingStrategy}
            onChange={e => update('documentParsingStrategy', e.target.value)}
            placeholder="section headings, HTML structure…"
          />
        </label>
        <label className="designer-field">
          <span>Structural/section-aware retrieval</span>
          <input
            value={value.structureAwareRetrieval}
            onChange={e => update('structureAwareRetrieval', e.target.value)}
            placeholder="use headings, TOC, layout…"
          />
        </label>
      </section>
      <section>
        <h2>Lexical &amp; symbolic retrieval</h2>
        <label className="designer-field">
          <span>Lexical or field-based retrieval</span>
          <input
            value={value.lexicalRetrieval}
            onChange={e => update('lexicalRetrieval', e.target.value)}
            placeholder="BM25, SQL LIKE, field filters…"
          />
        </label>
        <label className="designer-field">
          <span>Metadata/attribute filters</span>
          <input
            value={value.metadataFilters}
            onChange={e => update('metadataFilters', e.target.value)}
            placeholder="tenant, language, jurisdiction…"
          />
        </label>
        <label className="designer-field">
          <span>Symbolic or rule-based selection</span>
          <input
            value={value.symbolicSelection}
            onChange={e => update('symbolicSelection', e.target.value)}
            placeholder="policy rules, SQL predicates…"
          />
        </label>
        <label className="designer-field">
          <span>Exact-match controls</span>
          <input
            value={value.exactMatchControls}
            onChange={e => update('exactMatchControls', e.target.value)}
            placeholder="id lookups, strict filters…"
          />
        </label>
      </section>
      <section>
        <h2>Answering &amp; fallback</h2>
        <label className="designer-field">
          <span>Answer generation model</span>
          <input
            value={value.answerModel}
            onChange={e => update('answerModel', e.target.value)}
            placeholder="chat model used for answer"
          />
        </label>
        <label className="designer-field">
          <span>Fallback strategy</span>
          <input
            value={value.fallbackStrategy}
            onChange={e => update('fallbackStrategy', e.target.value)}
            placeholder="e.g. escalate to human, different index…"
          />
        </label>
      </section>
    </div>
  )
}

