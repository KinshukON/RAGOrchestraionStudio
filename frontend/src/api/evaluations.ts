import { apiClient } from './client'

// ─── Existing test-case types (kept for backwards compat) ────────────────────
export type TestCaseCreate = {
  workflow_id: string
  environment_id: string
  query: string
  strategy_id: string
  expected_answer?: string
  parameters?: Record<string, unknown>
}
export type TestCaseResponse = TestCaseCreate & { id: string; created_at: string }

export async function saveTestCase(payload: TestCaseCreate): Promise<TestCaseResponse> {
  const res = await apiClient.post<TestCaseResponse>('/api/evaluations/test-cases', payload)
  return res.data
}
export async function listTestCases(params?: { workflow_id?: string }): Promise<TestCaseResponse[]> {
  const res = await apiClient.get<TestCaseResponse[]>('/api/evaluations/test-cases', { params })
  return res.data
}

// ─── Benchmark harness ────────────────────────────────────────────────────────
export type StrategyScore = {
  strategy_id: string
  latency_ms: number
  confidence_score: number
  heuristic: { relevance: number; groundedness: number; completeness: number; composite: number }
  human_rating: number | null
  scored_at: string
}

export type BenchmarkQuery = {
  id: string
  query: string
  expected_answer: string
  expected_evidence: string[]
  rubric: string
  scenario_tag: string
  difficulty: string
  created_at: string
  scores: { per_strategy?: Record<string, StrategyScore> }
  human_rating: number | null
  status: 'pending' | 'scored'
}

export type BenchmarkQueryCreate = {
  query: string
  expected_answer?: string
  expected_evidence?: string[]
  rubric?: string
  scenario_tag?: string
  difficulty?: string
}

export type BenchmarkScoreInput = {
  strategy_id: string
  model_answer: string
  retrieved_titles?: string[]
  latency_ms?: number
  confidence_score?: number
  human_rating?: number
}

export async function listBenchmarkQueries(scenario_tag?: string): Promise<BenchmarkQuery[]> {
  const res = await apiClient.get<BenchmarkQuery[]>('/api/evaluations/benchmark-queries', {
    params: scenario_tag ? { scenario_tag } : undefined,
  })
  return res.data
}

export async function createBenchmarkQuery(payload: BenchmarkQueryCreate): Promise<BenchmarkQuery> {
  const res = await apiClient.post<BenchmarkQuery>('/api/evaluations/benchmark-queries', payload)
  return res.data
}

export async function scoreBenchmarkQuery(id: string, payload: BenchmarkScoreInput): Promise<BenchmarkQuery> {
  const res = await apiClient.patch<BenchmarkQuery>(`/api/evaluations/benchmark-queries/${id}/score`, payload)
  return res.data
}

export async function exportEvaluations(): Promise<unknown> {
  const res = await apiClient.get('/api/evaluations/export')
  return res.data
}

// ─── Aggregated chart data ─────────────────────────────────────────────────
export type LatencyRow = { query_id: string; label: string; strategy: string; latency_ms: number }
export type ScoreOverviewRow = { strategy: string; avg_relevance: number; avg_groundedness: number; avg_completeness: number }
export type HeatmapRow = { query_id: string; label: string; tag: string;[strategy: string]: string | number | null }

export type AggregatedScores = {
  generated_at: string
  strategies: string[]
  latency: LatencyRow[]
  scores_overview: ScoreOverviewRow[]
  per_query_heatmap: HeatmapRow[]
}

export async function aggregatedScores(): Promise<AggregatedScores> {
  const res = await apiClient.get<AggregatedScores>('/api/evaluations/aggregated-scores')
  return res.data
}
