import { apiClient } from './client'

export type IntegrationCategory =
  | 'llm_provider'
  | 'embedding_provider'
  | 'reranker'
  | 'vector_db'
  | 'graph_db'
  | 'sql_db'
  | 'file_storage'
  | 'document_repository'
  | 'enterprise_app'
  | 'api'
  | 'identity_provider'
  | 'logging_monitoring'

export type IntegrationConfig = {
  id: string
  name: string
  provider_type: IntegrationCategory
  credentials_reference: string
  environment_mapping: Record<string, string>
  default_usage_policies: Record<string, unknown>
  reusable: boolean
  health_status?: string | null
}

export async function listIntegrations() {
  const res = await apiClient.get<IntegrationConfig[]>('/api/integrations/')
  return res.data
}

export async function getIntegration(id: string) {
  const res = await apiClient.get<IntegrationConfig>(`/api/integrations/${id}`)
  return res.data
}

export async function createIntegration(config: IntegrationConfig) {
  const res = await apiClient.post<IntegrationConfig>('/api/integrations/', config)
  return res.data
}

export async function updateIntegration(id: string, config: IntegrationConfig) {
  const res = await apiClient.put<IntegrationConfig>(`/api/integrations/${id}`, config)
  return res.data
}

export async function deleteIntegration(id: string) {
  await apiClient.delete(`/api/integrations/${id}`)
}

