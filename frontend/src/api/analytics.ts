import { apiClient } from './client'

// ── Observability Analytics API ─────────────────────────────────────────

export async function fetchOperationsAnalytics(): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get('/api/observability/analytics/operations')
  return data
}

export async function fetchQualityAnalytics(): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get('/api/observability/analytics/quality')
  return data
}

export async function fetchGovernanceAnalytics(): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get('/api/observability/analytics/governance')
  return data
}

export async function fetchCostAnalytics(): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get('/api/observability/analytics/cost')
  return data
}

export async function fetchCausalAnalysis(runId: number): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get(`/api/observability/analytics/causal/${runId}`)
  return data
}

export async function fetchRunDiff(runA: number, runB: number): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get('/api/observability/runs/diff', { params: { run_a: runA, run_b: runB } })
  return data
}

export async function fetchRecommendations(): Promise<{ recommendations: Record<string, unknown>[]; count: number }> {
  const { data } = await apiClient.get('/api/observability/analytics/recommendations')
  return data
}

export async function fetchComparativeAnalytics(groupBy: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get('/api/observability/analytics/compare', { params: { group_by: groupBy } })
  return data
}

export async function exportRunTrace(runId: number): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get(`/api/observability/runs/${runId}/export`)
  return data
}

// ── Integration Stack Validation API ───────────────────────────────────

export async function fetchStackValidation(archType: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get(`/api/integrations/stack-validation/${archType}`)
  return data
}

export async function fetchConnectorPacks(): Promise<{ packs: Record<string, unknown> }> {
  const { data } = await apiClient.get('/api/integrations/connector-packs')
  return data
}

export async function fetchUsageAnalytics(): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get('/api/integrations/usage-analytics')
  return data
}

// ── Architecture Tiered Catalog API ─────────────────────────────────────

export async function fetchTieredCatalog(): Promise<{ tiers: Record<string, unknown>[]; total_architectures: number }> {
  const { data } = await apiClient.get('/api/architectures/catalog/tiered')
  return data
}

export async function fetchGovernanceProfiles(): Promise<{ profiles: Record<string, Record<string, unknown>> }> {
  const { data } = await apiClient.get('/api/architectures/governance-profiles')
  return data
}

export async function fetchBenchmarkPack(archKey: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get(`/api/architectures/catalog/${archKey}/benchmark-pack`)
  return data
}

export async function fetchArchFeatures(archKey: string): Promise<{ features: string[]; feature_count: number }> {
  const { data } = await apiClient.get(`/api/architectures/catalog/${archKey}/features`)
  return data
}
