import type { TemporalRagConfig } from './designerTypes'

type Props = {
  value: TemporalRagConfig
  onChange: (next: TemporalRagConfig) => void
}

export function TemporalDesignerStepGroups({ value, onChange }: Props) {
  function update<K extends keyof TemporalRagConfig>(key: K, nextValue: TemporalRagConfig[K]) {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className="designer-grid">
      <section>
        <h2>Temporal indexing</h2>
        <label className="designer-field">
          <span>Time-aware index source</span>
          <input
            value={value.timeAwareIndexSource}
            onChange={e => update('timeAwareIndexSource', e.target.value)}
            placeholder="temporal table, event log…"
          />
        </label>
        <label className="designer-field">
          <span>Effective-date logic</span>
          <input
            value={value.effectiveDateLogic}
            onChange={e => update('effectiveDateLogic', e.target.value)}
            placeholder="valid_from/valid_to, snapshot rules…"
          />
        </label>
      </section>
      <section>
        <h2>Recency &amp; windows</h2>
        <label className="designer-field">
          <span>Recency weighting</span>
          <input
            value={value.recencyWeighting}
            onChange={e => update('recencyWeighting', e.target.value)}
            placeholder="high, medium, low or numeric weight"
          />
        </label>
        <label className="designer-field">
          <span>Time window</span>
          <input
            value={value.timeWindow}
            onChange={e => update('timeWindow', e.target.value)}
            placeholder="e.g. 7d, 30d, 90d…"
          />
        </label>
      </section>
      <section>
        <h2>Events &amp; versions</h2>
        <label className="designer-field">
          <span>Event sequence retrieval</span>
          <input
            value={value.eventSequenceRetrieval}
            onChange={e => update('eventSequenceRetrieval', e.target.value)}
            placeholder="how to assemble event timelines"
          />
        </label>
        <label className="designer-field">
          <span>Version-aware filtering</span>
          <input
            value={value.versionAwareFiltering}
            onChange={e => update('versionAwareFiltering', e.target.value)}
            placeholder="which versions are in scope"
          />
        </label>
      </section>
      <section>
        <h2>Answering</h2>
        <label className="designer-field">
          <span>Answer generation model</span>
          <input
            value={value.answerModel}
            onChange={e => update('answerModel', e.target.value)}
            placeholder="chat model used for temporal answers"
          />
        </label>
      </section>
    </div>
  )
}

