import { useState } from 'react'
import type { IntegrationConfig } from '../../api/integrations'
import { useEnvironments, useIntegrations, useSaveEnvironment } from './useIntegrationsEnvApi'
import { EmptyState, LoadingMessage } from '../ui/feedback'
import { IntegrationWizard } from './IntegrationWizard'

export function IntegrationsHubPage() {
  const integrationsQuery = useIntegrations()
  const environmentsQuery = useEnvironments()
  const integrations = integrationsQuery.data ?? []
  const environments = environmentsQuery.data ?? []
  const saveEnvironment = useSaveEnvironment()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editing, setEditing] = useState<IntegrationConfig | null>(null)
  const [isCreatingEnv, setIsCreatingEnv] = useState(false)
  const [newEnvName, setNewEnvName] = useState('')
  const [newEnvDescription, setNewEnvDescription] = useState('')

  function handleCreateEnvironment(e: React.FormEvent) {
    e.preventDefault()
    if (!newEnvName.trim()) return
    const id = newEnvName.toLowerCase().replace(/\s+/g, '-')
    saveEnvironment.mutate({
      id,
      name: newEnvName,
      description: newEnvDescription,
      integration_bindings: {},
    })
    setIsCreatingEnv(false)
    setNewEnvName('')
    setNewEnvDescription('')
  }
  return (
    <div>
      <h1>Integrations Hub</h1>
      <p>Configure reusable integrations and map them to environments here.</p>
      <section style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Integrations</h2>
          <button type="button" onClick={() => setWizardOpen(true)}>
            New integration
          </button>
        </div>
        {integrationsQuery.isLoading ? (
          <LoadingMessage label="Loading integrations..." />
        ) : integrations.length === 0 ? (
          <EmptyState title="No integrations yet" description="Create your first integration to reuse across projects." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Reusable</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((integration: IntegrationConfig) => (
                <tr
                  key={integration.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setEditing(integration)
                    setWizardOpen(true)
                  }}
                >
                  <td>{integration.name}</td>
                  <td>{integration.provider_type}</td>
                  <td>{integration.reusable ? 'Yes' : 'No'}</td>
                  <td>{integration.health_status ?? 'Unknown'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Environments</h2>
          <button type="button" onClick={() => setIsCreatingEnv((v) => !v)}>
            {isCreatingEnv ? 'Cancel' : 'New environment'}
          </button>
        </div>

        {isCreatingEnv && (
          <form
            onSubmit={handleCreateEnvironment}
            style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}
          >
            <label>
              Name
              <input
                type="text"
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                style={{ display: 'block', marginTop: '0.25rem' }}
              />
            </label>
            <label style={{ flex: 1 }}>
              Description
              <input
                type="text"
                value={newEnvDescription}
                onChange={(e) => setNewEnvDescription(e.target.value)}
                style={{ display: 'block', marginTop: '0.25rem', width: '100%' }}
              />
            </label>
            <button type="submit" disabled={saveEnvironment.isPending}>
              {saveEnvironment.isPending ? 'Saving…' : 'Create'}
            </button>
          </form>
        )}
        {environmentsQuery.isLoading ? (
          <LoadingMessage label="Loading environments..." />
        ) : environments.length === 0 || integrations.length === 0 ? (
          <EmptyState
            title="No environments or integrations"
            description="Define environments and at least one integration to manage bindings."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Environment</th>
                {integrations.map((integration) => (
                  <th key={integration.id}>{integration.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {environments.map((env) => (
                <tr key={env.id}>
                  <td>{env.name}</td>
                  {integrations.map((integration) => {
                    const bound = env.integration_bindings[integration.id] ?? ''
                    return (
                      <td key={integration.id}>
                        <select
                          value={bound}
                          onChange={(e) =>
                            saveEnvironment.mutate({
                              ...env,
                              integration_bindings: {
                                ...env.integration_bindings,
                                [integration.id]: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="">Unbound</option>
                          <option value={integration.id}>{integration.id}</option>
                        </select>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {wizardOpen && (
        <IntegrationWizard
          initial={editing}
          onClose={() => {
            setEditing(null)
            setWizardOpen(false)
          }}
        />
      )}
    </div>
  )
}

