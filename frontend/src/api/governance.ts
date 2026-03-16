import { apiClient } from './client'

export type GovernancePolicy = {
  id: number | string
  name: string
  scope: string
  rules: Record<string, unknown>
  created_by?: number | string | null
  created_at: string
  updated_at: string
}

export type ApprovalRule = {
  id: number | string
  name: string
  applies_to: string
  required_roles: string[]
  escalation_path: Record<string, unknown>
  active: boolean
  created_at: string
  updated_at: string
}

export type GovernanceBinding = {
  id: number | string
  policy_id: number | string
  workflow_id?: string | null
  environment_id?: string | null
  architecture_type?: string | null
  status: string
  created_at: string
  updated_at: string
}

export async function listPolicies(params?: { scope?: string }): Promise<GovernancePolicy[]> {
  const res = await apiClient.get<GovernancePolicy[]>('/api/governance/policies', { params })
  return res.data
}

export async function getPolicy(policyId: number | string): Promise<GovernancePolicy> {
  const res = await apiClient.get<GovernancePolicy>(`/api/governance/policies/${policyId}`)
  return res.data
}

export async function createPolicy(payload: {
  name: string
  scope?: string
  rules?: Record<string, unknown>
  created_by?: string
}): Promise<GovernancePolicy> {
  const res = await apiClient.post<GovernancePolicy>('/api/governance/policies', payload)
  return res.data
}

export async function updatePolicy(
  policyId: number | string,
  payload: { name?: string; scope?: string; rules?: Record<string, unknown> }
): Promise<GovernancePolicy> {
  const res = await apiClient.patch<GovernancePolicy>(`/api/governance/policies/${policyId}`, payload)
  return res.data
}

export async function deletePolicy(policyId: number | string): Promise<void> {
  await apiClient.delete(`/api/governance/policies/${policyId}`)
}

export async function listApprovalRules(params?: { applies_to?: string }): Promise<ApprovalRule[]> {
  const res = await apiClient.get<ApprovalRule[]>('/api/governance/approval-rules', { params })
  return res.data
}

export async function createApprovalRule(payload: {
  name: string
  applies_to?: string
  required_roles?: string[]
  escalation_path?: Record<string, unknown>
  active?: boolean
}): Promise<ApprovalRule> {
  const res = await apiClient.post<ApprovalRule>('/api/governance/approval-rules', payload)
  return res.data
}

export async function updateApprovalRule(
  ruleId: number | string,
  payload: {
    name?: string
    applies_to?: string
    required_roles?: string[]
    escalation_path?: Record<string, unknown>
    active?: boolean
  }
): Promise<ApprovalRule> {
  const res = await apiClient.patch<ApprovalRule>(`/api/governance/approval-rules/${ruleId}`, payload)
  return res.data
}

export async function deleteApprovalRule(ruleId: number | string): Promise<void> {
  await apiClient.delete(`/api/governance/approval-rules/${ruleId}`)
}

export async function listBindings(params?: {
  policy_id?: string
  workflow_id?: string
  environment_id?: string
  architecture_type?: string
}): Promise<GovernanceBinding[]> {
  const res = await apiClient.get<GovernanceBinding[]>('/api/governance/bindings', { params })
  return res.data
}

export async function createBinding(payload: {
  policy_id: number | string
  workflow_id?: string
  environment_id?: string
  architecture_type?: string
  status?: string
}): Promise<GovernanceBinding> {
  const res = await apiClient.post<GovernanceBinding>('/api/governance/bindings', payload)
  return res.data
}

export async function deleteBinding(bindingId: number | string): Promise<void> {
  await apiClient.delete(`/api/governance/bindings/${bindingId}`)
}
