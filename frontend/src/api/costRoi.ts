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
  breakdown: {
    embedding_cost_per_query: number
    llm_input_cost_per_query: number
    llm_output_cost_per_query: number
    embedding_pct: number
    llm_input_pct: number
    llm_output_pct: number
  }
  explanation: {
    methodology: string
    assumptions: string[]
    benchmark_sources: { name: string; url: string; date: string }[]
    profile_notes: string
  }
  inputs_used: Record<string, number | string>
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

// ── API functions ────────────────────────────────────────────────────────

export async function listCostProfiles(): Promise<CostProfile[]> {
  const { data } = await apiClient.get('/cost-roi/profiles')
  return data
}

export async function getCostProfile(archType: string): Promise<CostProfile> {
  const { data } = await apiClient.get(`/cost-roi/profiles/${archType}`)
  return data
}

export async function calculateCost(body: CalculateRequest): Promise<CalculateResponse> {
  const { data } = await apiClient.post('/cost-roi/calculate', body)
  return data
}

export async function listScenarios(userId = 'anonymous'): Promise<CostScenario[]> {
  const { data } = await apiClient.get('/cost-roi/scenarios', { params: { user_id: userId } })
  return data
}

export async function saveScenario(body: {
  name: string
  architecture_type: string
  inputs: Record<string, unknown>
  results: Record<string, unknown>
}): Promise<CostScenario> {
  const { data } = await apiClient.post('/cost-roi/scenarios', body)
  return data
}

export async function deleteScenario(id: number): Promise<void> {
  await apiClient.delete(`/cost-roi/scenarios/${id}`)
}
