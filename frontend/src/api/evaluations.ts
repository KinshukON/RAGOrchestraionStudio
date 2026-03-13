import { apiClient } from './client'

export type TestCaseCreate = {
  workflow_id: string
  environment_id: string
  query: string
  strategy_id: string
  expected_answer?: string | null
  parameters?: Record<string, unknown> | null
}

export type TestCaseResponse = {
  id: string
  workflow_id: string
  environment_id: string
  query: string
  strategy_id: string
  expected_answer?: string | null
  parameters?: Record<string, unknown> | null
  created_at: string
}

export async function saveTestCase(payload: TestCaseCreate): Promise<TestCaseResponse> {
  const res = await apiClient.post<TestCaseResponse>('/api/evaluations/test-cases', payload)
  return res.data
}

export async function listTestCases(params?: {
  workflow_id?: string
  environment_id?: string
}): Promise<TestCaseResponse[]> {
  const res = await apiClient.get<TestCaseResponse[]>('/api/evaluations/test-cases', { params })
  return res.data
}
