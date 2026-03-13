import type { GraphRagConfig } from './designerTypes'

type Props = {
  value: GraphRagConfig
  onChange: (next: GraphRagConfig) => void
}

export function GraphDesignerStepGroups({ value, onChange }: Props) {
  function update<K extends keyof GraphRagConfig>(key: K, nextValue: GraphRagConfig[K]) {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className="designer-grid">
      <section>
        <h2>Graph store &amp; ontology</h2>
        <label className="designer-field">
          <span>Graph database</span>
          <input
            value={value.graphDatabase}
            onChange={e => update('graphDatabase', e.target.value)}
            placeholder="Neo4j, Neptune, ArangoDB…"
          />
        </label>
        <label className="designer-field">
          <span>Ontology / entity model hints</span>
          <input
            value={value.ontologyHints}
            onChange={e => update('ontologyHints', e.target.value)}
            placeholder="key entity types, relationships…"
          />
        </label>
        <label className="designer-field">
          <span>Graph node types</span>
          <input
            value={value.nodeTypes}
            onChange={e => update('nodeTypes', e.target.value)}
            placeholder="e.g. Person, Document, Policy…"
          />
        </label>
        <label className="designer-field">
          <span>Graph edge types</span>
          <input
            value={value.edgeTypes}
            onChange={e => update('edgeTypes', e.target.value)}
            placeholder="REFERS_TO, AUTHORED_BY…"
          />
        </label>
      </section>
      <section>
        <h2>Traversal &amp; expansion</h2>
        <label className="designer-field">
          <span>Entity extraction strategy</span>
          <input
            value={value.entityExtractionStrategy}
            onChange={e => update('entityExtractionStrategy', e.target.value)}
            placeholder="NER model, regex, rules…"
          />
        </label>
        <label className="designer-field">
          <span>Traversal depth</span>
          <input
            type="number"
            min={1}
            value={value.traversalDepth}
            onChange={e => update('traversalDepth', Number(e.target.value) || 1)}
          />
        </label>
        <label className="designer-field">
          <span>Graph expansion logic</span>
          <input
            value={value.expansionLogic}
            onChange={e => update('expansionLogic', e.target.value)}
            placeholder="neighbors, constrained paths…"
          />
        </label>
      </section>
      <section>
        <h2>Ranking &amp; answering</h2>
        <label className="designer-field">
          <span>Graph ranking strategy</span>
          <input
            value={value.rankingStrategy}
            onChange={e => update('rankingStrategy', e.target.value)}
            placeholder="path score, pagerank, hybrid…"
          />
        </label>
        <label className="designer-field">
          <span>Answer generation model</span>
          <input
            value={value.answerModel}
            onChange={e => update('answerModel', e.target.value)}
            placeholder="chat model for final answer"
          />
        </label>
      </section>
    </div>
  )
}

