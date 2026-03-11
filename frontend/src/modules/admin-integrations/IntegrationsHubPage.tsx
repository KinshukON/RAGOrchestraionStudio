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
        <h2>Environments</h2>
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

