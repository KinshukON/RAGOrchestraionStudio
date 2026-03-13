import { apiClient } from './client'

export type WorkflowRunSummary = {
  id: number
  workflow_id: string
  status: string
  created_at: string
  finished_at?: string | null
}

export async function listWorkflowRuns() {
  const res = await apiClient.get<WorkflowRunSummary[]>('/api/workflows/runs')
  return res.data
}

