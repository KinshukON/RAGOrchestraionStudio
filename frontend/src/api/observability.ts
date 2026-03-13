import { apiClient } from './client'

export type RunSummary = {
  id: number
  workflow_id: string
  status: string
  created_at: string
  finished_at?: string | null
  architecture_type?: string | null
  strategy_id?: string | null
  environment_external_id?: string | null
  is_simulated: boolean
  metrics: Record<string, unknown>
}

export type RunDetail = {
  id: number
  workflow_id: string
  status: string
  created_at: string
  started_at?: string | null
  finished_at?: string | null
  input_payload: Record<string, unknown>
  output_payload: Record<string, unknown>
  architecture_type?: string | null
  strategy_id?: string | null
  environment_external_id?: string | null
  is_simulated: boolean
  metrics: Record<string, unknown>
}

export type TaskSummary = {
  id: number
  run_id: number
  node_id: string
  node_type: string
  status: string
  started_at?: string | null
  finished_at?: string | null
  step_index?: number | null
  error?: string | null
  trace_metadata: Record<string, unknown>
}

export async function listObservabilityRuns(params?: {
  workflow_id?: string
  status?: string
  is_simulated?: boolean
}): Promise<RunSummary[]> {
  const res = await apiClient.get<RunSummary[]>('/api/observability/runs', { params })
  return res.data
}

export async function getObservabilityRun(runId: number): Promise<RunDetail> {
  const res = await apiClient.get<RunDetail>(`/api/observability/runs/${runId}`)
  return res.data
}

export async function listObservabilityRunTasks(runId: number): Promise<TaskSummary[]> {
  const res = await apiClient.get<TaskSummary[]>(`/api/observability/runs/${runId}/tasks`)
  return res.data
}
