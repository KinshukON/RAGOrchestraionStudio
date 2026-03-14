import { apiClient } from './client'

export type NodeType =
  | 'input_query'
  | 'query_classifier'
  | 'intent_detector'
  | 'embedding_generator'
  | 'vector_retriever'
  | 'lexical_retriever'
  | 'metadata_filter'
  | 'sql_retriever'
  | 'graph_retriever'
  | 'temporal_filter'
  | 'conflict_resolver'
  | 'reranker'
  | 'context_assembler'
  | 'prompt_constructor'
  | 'llm_answer_generator'
  | 'evaluator'
  | 'source_citation_builder'
  | 'guardrail'
  | 'fallback_route'
  | 'output_formatter'

export type WorkflowNode = {
  id: string
  type: NodeType
  name: string
  config: Record<string, unknown>
  position: { x: number; y: number }
}

export type WorkflowEdge = {
  id: string
  source: string
  target: string
  condition?: string | null
}

export type WorkflowDefinition = {
  id: string
  project_id: string
  name: string
  description: string
  version: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  is_active: boolean
  architecture_type: string
}

export async function listWorkflows() {
  const res = await apiClient.get<WorkflowDefinition[]>('/api/workflows')
  return res.data
}

export async function getWorkflow(id: string) {
  const res = await apiClient.get<WorkflowDefinition>(`/api/workflows/${id}`)
  return res.data
}

export async function createWorkflow(definition: WorkflowDefinition) {
  const res = await apiClient.post<WorkflowDefinition>('/api/workflows', definition)
  return res.data
}

export async function updateWorkflow(id: string, definition: WorkflowDefinition) {
  const res = await apiClient.put<WorkflowDefinition>(`/api/workflows/${id}`, definition)
  return res.data
}


// ── Real RAG Run API ─────────────────────────────────────────────────────────

export type RAGSpan = {
  step: string
  latency_ms: number
  simulated: boolean
  [key: string]: unknown
}

export type RAGRunRequest = {
  query: string
  project_id?: string
  environment_id?: string
  architecture_type?: string
  parameters?: Record<string, unknown>
}

export type RAGRunResponse = {
  run_id: number
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
  is_simulated: boolean
  model_used: string
  input_tokens: number
  output_tokens: number
  spans: RAGSpan[]
}

export type StrategyRunResult = {
  strategy_id: string
  trace: RAGRunResponse
}

export type MultiRunRequest = {
  query: string
  project_id?: string
  environment_id?: string
  strategies?: string[]
  parameters?: Record<string, unknown>
}

export type MultiRunResponse = {
  results: StrategyRunResult[]
}

export type WorkflowRunSummary = {
  id: number
  workflow_id: string
  status: string
  created_at: string
  finished_at: string | null
}

export async function runWorkflow(workflowId: string, payload: RAGRunRequest): Promise<RAGRunResponse> {
  const res = await apiClient.post<RAGRunResponse>(`/api/workflows/${workflowId}/run`, payload)
  return res.data
}

export async function runWorkflowMulti(workflowId: string, payload: MultiRunRequest): Promise<MultiRunResponse> {
  const res = await apiClient.post<MultiRunResponse>(`/api/workflows/${workflowId}/run-multi`, payload)
  return res.data
}

export async function listWorkflowRuns(): Promise<WorkflowRunSummary[]> {
  const res = await apiClient.get<WorkflowRunSummary[]>('/api/workflows/runs')
  return res.data
}

export async function getRunTasks(workflowId: string, runId: number) {
  const res = await apiClient.get(`/api/workflows/${workflowId}/runs/${runId}/tasks`)
  return res.data
}
