import type { HybridRagConfig } from './designerTypes'

type Props = {
  value: HybridRagConfig
  onChange: (next: HybridRagConfig) => void
}

export function HybridDesignerStepGroups({ value, onChange }: Props) {
  function update<K extends keyof HybridRagConfig>(key: K, nextValue: HybridRagConfig[K]) {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className="designer-grid">
      <section>
        <h2>Retrieval modes</h2>
        <label className="designer-field">
          <span>Participating retrieval modes</span>
          <input
            value={value.retrievalModes}
            onChange={e => update('retrievalModes', e.target.value)}
            placeholder="vector + lexical + graph…"
          />
        </label>
        <label className="designer-field">
          <span>Routing policy</span>
          <input
            value={value.routingPolicy}
            onChange={e => update('routingPolicy', e.target.value)}
            placeholder="intent-based, rules-based, weighted…"
          />
        </label>
        <label className="designer-field">
          <span>Sequential vs parallel</span>
          <select
            value={value.executionMode}
            onChange={e => update('executionMode', e.target.value as HybridRagConfig['executionMode'])}
          >
            <option value="sequential">Sequential</option>
            <option value="parallel">Parallel</option>
          </select>
        </label>
      </section>
      <section>
        <h2>Fusion &amp; arbitration</h2>
        <label className="designer-field">
          <span>Score fusion strategy</span>
          <input
            value={value.scoreFusionStrategy}
            onChange={e => update('scoreFusionStrategy', e.target.value)}
            placeholder="weighted sum, max score, Borda…"
          />
        </label>
        <label className="designer-field">
          <span>Precedence / override rules</span>
          <input
            value={value.precedenceRules}
            onChange={e => update('precedenceRules', e.target.value)}
            placeholder="e.g. regulatory sources override others"
          />
        </label>
        <label className="designer-field">
          <span>Confidence arbitration</span>
          <input
            value={value.confidenceArbitration}
            onChange={e => update('confidenceArbitration', e.target.value)}
            placeholder="how to decide between conflicting answers"
          />
        </label>
      </section>
      <section>
        <h2>Answering &amp; fallback</h2>
        <label className="designer-field">
          <span>Fallback behavior</span>
          <input
            value={value.fallbackBehavior}
            onChange={e => update('fallbackBehavior', e.target.value)}
            placeholder="e.g. pick highest-confidence single mode"
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

