import { apiClient } from './client'

export type WorkflowSimulationRequest = {
  project_id: string
  environment_id: string
  query: string
}

export type WorkflowSimulationTrace = {
  retrieved_sources: Record<string, unknown>[]
  retrieval_path: string[]
  vector_hits: Record<string, unknown>[]
  metadata_matches: Record<string, unknown>[]
  graph_traversal: Record<string, unknown>[]
  temporal_filters: Record<string, unknown>[]
  reranking_decisions: Record<string, unknown>[]
  final_prompt_context: string
  model_answer: string
  grounded_citations: Record<string, unknown>[]
  latency_ms: number
  confidence_score: number
  hallucination_risk: string
}

export async function simulateWorkflow(workflowId: string, payload: WorkflowSimulationRequest) {
  const res = await apiClient.post<WorkflowSimulationTrace>(`/api/workflows/${workflowId}/simulate`, payload)
  return res.data
}

export type MultiStrategySimulationRequest = WorkflowSimulationRequest & {
  strategies?: string[]
  parameters?: Record<string, unknown>
}

export type StrategyTrace = {
  strategy_id: string
  trace: WorkflowSimulationTrace
}

export type MultiStrategySimulationTrace = {
  results: StrategyTrace[]
}

export async function simulateWorkflowMulti(workflowId: string, payload: MultiStrategySimulationRequest) {
  const res = await apiClient.post<MultiStrategySimulationTrace>(
    `/api/workflows/${workflowId}/simulate-multi`,
    payload,
  )
  return res.data
}

