import { apiClient } from './client'

// ── Types ────────────────────────────────────────────────────────────────

export interface ExecutiveKpis {
  generated_at: string
  kpis: {
    total_runs: number
    success_rate: number
    failure_rate: number
    total_cost: number
    avg_cost_per_run: number
    active_architectures: number
    architecture_list: string[]
    active_environments: number
    environment_list: string[]
    avg_latency_ms: number | null
  }
}

export interface ActionItem {
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  link: string
}

export interface BusinessCase {
  document_type: string
  generated_at: string
  architecture: { type: string; label: string; latency_ms: number }
  investment: { platform_setup_cost: number; monthly_operating_cost: number; annual_operating_cost: number }
  returns: { monthly_business_value: number; annual_business_value: number; monthly_net_savings: number; annual_net_savings: number; payback_period_months: number | null }
  impact_breakdown: Record<string, number>
  risk_assessment: Record<string, unknown>
  executive_recommendation: { recommendation: string; why_this_architecture: string; next_steps: string[] }
  parameters_used: Record<string, number>
}

export interface RoiSummaryArch {
  type: string
  label: string
  monthly_cost: number
  monthly_value: number
  monthly_net: number
  latency_ms: number
}

// ── API functions ────────────────────────────────────────────────────────

export async function fetchExecutiveKpis(): Promise<ExecutiveKpis> {
  const { data } = await apiClient.get('/api/executive/kpis')
  return data
}

export async function fetchActionBoard(): Promise<{ actions: ActionItem[]; action_count: number }> {
  const { data } = await apiClient.get('/api/executive/action-board')
  return data
}

export async function fetchBusinessCase(params?: {
  architecture_type?: string
  monthly_query_volume?: number
  analyst_hours_saved?: number
  analyst_hourly_rate?: number
  platform_setup_cost?: number
}): Promise<BusinessCase> {
  const { data } = await apiClient.get('/api/executive/business-case', { params })
  return data
}

export async function fetchRoiSummary(): Promise<{ architectures: RoiSummaryArch[]; recommended: string }> {
  const { data } = await apiClient.get('/api/executive/roi-summary')
  return data
}
