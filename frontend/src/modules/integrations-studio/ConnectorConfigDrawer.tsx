import { useState } from 'react'
import type { ConnectorDef } from './connectorRegistry'
import { CATEGORY_LABELS } from './connectorRegistry'
import { useSaveIntegration } from '../admin-integrations/useIntegrationsEnvApi'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { testConnection } from '../../api/integrations'
import { useToast } from '../ui/ToastContext'

type Props = {
  connector: ConnectorDef
  onClose: () => void
}

export function ConnectorConfigDrawer({ connector, onClose }: Props) {
  const { success, error: showError } = useToast()
  const queryClient = useQueryClient()
  const saveIntegration = useSaveIntegration()

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of connector.fields) {
      init[f.key] = ''
    }
    return init
  })

  const [displayName, setDisplayName] = useState(connector.name)
  const [saved, setSaved] = useState(false)
  const [savedId, setSavedId] = useState('')

  const testMutation = useMutation({
    mutationFn: (id: string) => testConnection(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      if (result.status === 'healthy') success(`Connected — ${result.latency_ms} ms`)
      else showError(`${result.status}: ${result.message}`)
    },
    onError: () => showError('Test connection failed'),
  })

  function handleSave() {
    const id = connector.key.replace(/[^a-z0-9_-]/g, '')
    saveIntegration.mutate(
      {
        id,
        name: displayName,
        provider_type: connector.category,
        credentials_reference: `vault://${connector.key}`,
        environment_mapping: {},
        default_usage_policies: {},
        reusable: true,
        health_status: null,
      },
      {
        onSuccess: () => {
          setSaved(true)
          setSavedId(id)
          success(`${connector.name} integration saved!`)
        },
        onError: () => showError('Failed to save integration'),
      },
    )
  }

  function setField(key: string, value: string) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  const allRequiredFilled = connector.fields
    .filter(f => f.required)
    .every(f => values[f.key]?.trim())

  return (
    <div className="conn-drawer-backdrop" onClick={onClose}>
      <aside className="conn-drawer" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <header className="conn-drawer-header">
          <div className="conn-drawer-header-left">
            <div className="conn-drawer-icon" style={{ background: `${connector.color}18` }}>
              <span>{connector.icon}</span>
            </div>
            <div>
              <h2 className="conn-drawer-title">{connector.name}</h2>
              <span className="conn-drawer-category">
                {CATEGORY_LABELS[connector.category] ?? connector.category}
              </span>
            </div>
          </div>
          <button className="conn-drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <p className="conn-drawer-description">{connector.description}</p>

        {/* Form */}
        <div className="conn-drawer-body">
          <label className="conn-drawer-field">
            <span className="conn-drawer-field-label">Display Name</span>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="conn-drawer-input"
            />
          </label>

          <div className="conn-drawer-divider" />

          {connector.fields.map(field => (
            <label key={field.key} className="conn-drawer-field">
              <span className="conn-drawer-field-label">
                {field.label}
                {field.required && <span className="conn-drawer-required">*</span>}
              </span>
              {field.type === 'select' ? (
                <select
                  value={values[field.key]}
                  onChange={e => setField(field.key, e.target.value)}
                  className="conn-drawer-input"
                >
                  <option value="">Select…</option>
                  {field.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                  value={values[field.key]}
                  onChange={e => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="conn-drawer-input"
                />
              )}
            </label>
          ))}
        </div>

        {/* Footer */}
        <footer className="conn-drawer-footer">
          {saved ? (
            <>
              <button
                type="button"
                className="conn-drawer-btn conn-drawer-btn--secondary"
                onClick={() => testMutation.mutate(savedId)}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? 'Testing…' : 'Test Connection'}
              </button>
              <button
                type="button"
                className="conn-drawer-btn conn-drawer-btn--ghost"
                onClick={onClose}
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="conn-drawer-btn conn-drawer-btn--ghost"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="conn-drawer-btn conn-drawer-btn--primary"
                onClick={handleSave}
                disabled={!allRequiredFilled || saveIntegration.isPending}
              >
                {saveIntegration.isPending ? 'Saving…' : 'Save Integration'}
              </button>
            </>
          )}
        </footer>
      </aside>
    </div>
  )
}
