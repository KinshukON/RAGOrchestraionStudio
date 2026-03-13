import { apiClient } from './client'

export type ArchitectureType = 'vector' | 'vectorless' | 'graph' | 'temporal' | 'hybrid' | 'custom'

export type ArchitectureTemplate = {
  key: string
  type: ArchitectureType
  title: string
  short_definition: string
  when_to_use: string
  strengths: Record<string, unknown>
  tradeoffs: Record<string, unknown>
  typical_backends: Record<string, unknown>
}

export type DesignSession = {
  id: number
  architecture_type: ArchitectureType
  project_id: number | null
  status: string
  wizard_state: Record<string, unknown>
  derived_architecture_definition: Record<string, unknown>
}

export async function listArchitectureCatalog() {
  const res = await apiClient.get<ArchitectureTemplate[]>('/api/architectures/catalog')
  return res.data
}

export async function createDesignSession(body: { architecture_type: ArchitectureType; project_id?: number | null }) {
  const res = await apiClient.post<DesignSession>('/api/architectures/design-sessions', body)
  return res.data
}

export async function getDesignSession(id: number) {
  const res = await apiClient.get<DesignSession>(`/api/architectures/design-sessions/${id}`)
  return res.data
}

export async function updateDesignSession(id: number, body: { wizard_state?: Record<string, unknown>; derived_architecture_definition?: Record<string, unknown> }) {
  const res = await apiClient.patch<DesignSession>(`/api/architectures/design-sessions/${id}`, body)
  return res.data
}

