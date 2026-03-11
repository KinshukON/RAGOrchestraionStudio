import { useState } from 'react'
import type { IntegrationCategory, IntegrationConfig } from '../../api/integrations'
import { useSaveIntegration } from './useIntegrationsEnvApi'

type Props = {
  initial?: IntegrationConfig | null
  onClose: () => void
}

const CATEGORIES: IntegrationCategory[] = [
  'llm_provider',
  'embedding_provider',
  'reranker',
  'vector_db',
  'graph_db',
  'sql_db',
  'file_storage',
  'document_repository',
  'enterprise_app',
  'api',
  'identity_provider',
  'logging_monitoring',
]

export function IntegrationWizard({ initial, onClose }: Props) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<IntegrationConfig>(
    initial ?? {
      id: '',
      name: '',
      provider_type: 'vector_db',
      credentials_reference: '',
      environment_mapping: {},
      default_usage_policies: {},
      reusable: true,
      health_status: null,
    },
  )

  const saveIntegration = useSaveIntegration()

  function next() {
    setStep((s) => Math.min(3, s + 1))
  }

  function prev() {
    setStep((s) => Math.max(1, s - 1))
  }

  function handleSubmit() {
    if (!form.id || !form.name) {
      return
    }
    saveIntegration.mutate(form, {
      onSuccess: () => onClose(),
    })
  }

  return (
    <div className="int-wizard-backdrop">
      <div className="int-wizard">
        <header className="int-wizard-header">
          <h2>{initial ? 'Edit Integration' : 'New Integration'}</h2>
          <button type="button" onClick={onClose} aria-label="Close integration wizard">
            ✕
          </button>
        </header>

        <div className="int-wizard-steps">
          <span className={step === 1 ? 'active' : ''}>1. Basics</span>
          <span className={step === 2 ? 'active' : ''}>2. Connection</span>
          <span className={step === 3 ? 'active' : ''}>3. Policies</span>
        </div>

        <div className="int-wizard-body">
          {step === 1 && (
            <div>
              <label>
                Integration ID
                <input
                  type="text"
                  value={form.id}
                  disabled={!!initial}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                />
              </label>
              <label>
                Name
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Provider type
                <select
                  value={form.provider_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      provider_type: e.target.value as IntegrationCategory,
                    })
                  }
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {step === 2 && (
            <div>
              <label>
                Credentials reference
                <input
                  type="text"
                  value={form.credentials_reference}
                  onChange={(e) => setForm({ ...form, credentials_reference: e.target.value })}
                />
              </label>
              <label>
                Dev environment mapping
                <input
                  type="text"
                  value={form.environment_mapping.dev ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      environment_mapping: { ...form.environment_mapping, dev: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Prod environment mapping
                <input
                  type="text"
                  value={form.environment_mapping.prod ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      environment_mapping: { ...form.environment_mapping, prod: e.target.value },
                    })
                  }
                />
              </label>
            </div>
          )}

          {step === 3 && (
            <div>
              <label>
                Max QPS
                <input
                  type="number"
                  value={(form.default_usage_policies.max_qps as number | undefined) ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      default_usage_policies: {
                        ...form.default_usage_policies,
                        max_qps: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
              <label>
                Allowed projects (comma separated)
                <input
                  type="text"
                  value={((form.default_usage_policies.allowed_projects as string[]) ?? []).join(',')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      default_usage_policies: {
                        ...form.default_usage_policies,
                        allowed_projects: e.target.value.split(',').map((s) => s.trim()),
                      },
                    })
                  }
                />
              </label>
            </div>
          )}
        </div>

        <footer className="int-wizard-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          {step > 1 && (
            <button type="button" onClick={prev}>
              Back
            </button>
          )}
          {step < 3 && (
            <button type="button" onClick={next}>
              Next
            </button>
          )}
          {step === 3 && (
            <button type="button" onClick={handleSubmit} disabled={saveIntegration.isPending}>
              {saveIntegration.isPending ? 'Saving…' : 'Save'}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}

