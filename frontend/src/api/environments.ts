import { apiClient } from './client'

export type EnvironmentConfig = {
  id: string
  name: string
  description: string
  integration_bindings: Record<string, string>
}

export async function listEnvironments() {
  const res = await apiClient.get<EnvironmentConfig[]>('/api/environments/')
  return res.data
}

export async function getEnvironment(id: string) {
  const res = await apiClient.get<EnvironmentConfig>(`/api/environments/${id}`)
  return res.data
}

export async function createEnvironment(config: EnvironmentConfig) {
  const res = await apiClient.post<EnvironmentConfig>('/api/environments/', config)
  return res.data
}

export async function updateEnvironment(id: string, config: EnvironmentConfig) {
  const res = await apiClient.put<EnvironmentConfig>(`/api/environments/${id}`, config)
  return res.data
}

export async function deleteEnvironment(id: string) {
  await apiClient.delete(`/api/environments/${id}`)
}

