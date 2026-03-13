import type { CustomRagConfig } from './designerTypes'

type Props = {
  value: CustomRagConfig
  onChange: (next: CustomRagConfig) => void
}

export function CustomDesignerStepGroups({ value, onChange }: Props) {
  function update<K extends keyof CustomRagConfig>(key: K, nextValue: CustomRagConfig[K]) {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className="designer-grid designer-grid--single">
      <section>
        <h2>Custom architecture notes</h2>
        <label className="designer-field">
          <span>High-level summary</span>
          <textarea
            value={value.summary}
            onChange={e => update('summary', e.target.value)}
            placeholder="Describe the custom retrieval and orchestration you have in mind."
            rows={4}
          />
        </label>
        <label className="designer-field">
          <span>Additional notes</span>
          <textarea
            value={value.notes}
            onChange={e => update('notes', e.target.value)}
            placeholder="Capture constraints, data sources, special policies, or ideas for workflow structure."
            rows={5}
          />
        </label>
      </section>
    </div>
  )
}

