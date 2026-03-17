import { apiClient } from './client'

// ── Types ────────────────────────────────────────────────────────────────

export interface CostProfile {
  id: number
  architecture_type: string
  label: string
  default_top_k: number
  default_chunk_size: number
  latency_estimate_ms: number
  latency_source: string
  embedding_cost_per_1m: number
  llm_input_cost_per_1m: number
  llm_output_cost_per_1m: number
  reranker_cost_per_1m: number
  graph_traversal_cost_per_1m: number
  index_storage_cost_monthly: number
  infra_base_cost_monthly: number
  ticket_deflection_rate: number
  compliance_hours_saved_monthly: number
  escalation_reduction_rate: number
  failed_answer_reduction_rate: number
  search_effort_reduction_rate: number
  analyst_hours_saved_monthly: number
  notes: string
  benchmark_sources: { name: string; url: string; date: string }[]
}

export interface CalculateRequest {
  architecture_type: string
  monthly_query_volume?: number
  top_k?: number | null
  chunk_size?: number | null
  embedding_cost_per_1m?: number | null
  llm_input_cost_per_1m?: number | null
  llm_output_cost_per_1m?: number | null
  avg_context_tokens?: number
  avg_output_tokens?: number
  analyst_hours_saved?: number
  analyst_hourly_rate?: number
  platform_setup_cost?: number
}

export interface CalculateResponse {
  architecture_type: string
  architecture_label: string
  cost_per_query: number
  cost_per_1k_queries: number
  monthly_cost: number
  annual_cost: number
  manual_monthly: number
  annual_savings: number
  payback_months: number | null
  latency_estimate_ms: number
  breakdown: Record<string, number>
  explanation: {
    methodology: string
    assumptions: string[]
    benchmark_sources: { name: string; url: string; date: string }[]
    profile_notes: string
  }
  inputs_used: Record<string, number | string>
  business_impact: Record<string, number>
  executive_summary: Record<string, unknown>
}

export interface CostScenario {
  id: number
  user_id: string
  name: string
  architecture_type: string
  inputs: Record<string, unknown>
  results: Record<string, unknown>
  created_at: string
}

export interface TcoArchitecture {
  architecture_type: string
  label: string
  cost_per_1k_queries: number
  monthly_cost: number
  annual_cost: number
  latency_ms: number
  monthly_business_value: number
  monthly_net_savings: number
  risk_reduction_score: number
  ticket_deflection_rate: number
  failed_answer_reduction_rate: number
  why_this_architecture: string
  notes: string
}

export interface UseCaseTemplate {
  id: string
  label: string
  description: string
  recommended_architecture: string
  architecture_label: string
  monthly_query_volume: number
  cost_per_1k_queries: number
  monthly_cost: number
  monthly_business_value: number
  monthly_net_savings: number
  projected_annual_value: number
  why: string
  key_value_driver: string
  typical_payback_months: number
}

export interface HeatmapEntry {
  architecture_type: string
  label: string
  environments: Record<string, { label: string; monthly_cost: number; query_volume: number; infra_cost: number }>
  total_monthly: number
}

// ── API functions ────────────────────────────────────────────────────────

export async function listCostProfiles(): Promise<CostProfile[]> {
  const { data } = await apiClient.get('/api/cost-roi/profiles')
  return data
}

export async function getCostProfile(archType: string): Promise<CostProfile> {
  const { data } = await apiClient.get(`/api/cost-roi/profiles/${archType}`)
  return data
}

export async function calculateCost(body: CalculateRequest): Promise<CalculateResponse> {
  const { data } = await apiClient.post('/api/cost-roi/calculate', body)
  return data
}

export async function listScenarios(userId = 'anonymous'): Promise<CostScenario[]> {
  const { data } = await apiClient.get('/api/cost-roi/scenarios', { params: { user_id: userId } })
  return data
}

export async function saveScenario(body: {
  name: string
  architecture_type: string
  inputs: Record<string, unknown>
  results: Record<string, unknown>
}): Promise<CostScenario> {
  const { data } = await apiClient.post('/api/cost-roi/scenarios', body)
  return data
}

export async function deleteScenario(id: number): Promise<void> {
  await apiClient.delete(`/api/cost-roi/scenarios/${id}`)
}

export async function fetchTcoComparator(params?: { monthly_query_volume?: number }): Promise<{ architectures: TcoArchitecture[]; recommendation: string; recommendation_label: string }> {
  const { data } = await apiClient.get('/api/cost-roi/tco-comparator', { params })
  return data
}

export async function fetchUseCaseTemplates(): Promise<{ templates: UseCaseTemplate[] }> {
  const { data } = await apiClient.get('/api/cost-roi/use-case-templates')
  return data
}

export async function fetchEnvCostHeatmap(params?: { monthly_query_volume?: number }): Promise<{ heatmap: HeatmapEntry[] }> {
  const { data } = await apiClient.get('/api/cost-roi/env-cost-heatmap', { params })
  return data
}

