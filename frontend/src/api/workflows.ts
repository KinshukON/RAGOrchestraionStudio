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
  const res = await apiClient.get<WorkflowDefinition[]>('/api/workflows/')
  return res.data
}

export async function getWorkflow(id: string) {
  const res = await apiClient.get<WorkflowDefinition>(`/api/workflows/${id}`)
  return res.data
}

export async function createWorkflow(definition: WorkflowDefinition) {
  const res = await apiClient.post<WorkflowDefinition>('/api/workflows/', definition)
  return res.data
}

export async function updateWorkflow(id: string, definition: WorkflowDefinition) {
  const res = await apiClient.put<WorkflowDefinition>(`/api/workflows/${id}`, definition)
  return res.data
}

