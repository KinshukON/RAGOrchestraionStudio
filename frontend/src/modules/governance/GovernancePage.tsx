import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ApprovalRule as ApprovalRuleType,
  GovernanceBinding as BindingType,
  GovernancePolicy as PolicyType,
} from '../../api/governance'
import {
  listPolicies,
  createPolicy,
  deletePolicy,
  listApprovalRules,
  createApprovalRule,
  deleteApprovalRule,
  listBindings,
  createBinding,
  deleteBinding,
} from '../../api/governance'
import { EmptyState, LoadingMessage } from '../ui/feedback'
import './governance.css'

type Tab = 'policies' | 'approvals' | 'bindings'

export function GovernancePage() {
  const [tab, setTab] = useState<Tab>('policies')
  const [newPolicyName, setNewPolicyName] = useState('')
  const [newPolicyScope, setNewPolicyScope] = useState('workflow')
  const [newRuleName, setNewRuleName] = useState('')
  const [newRuleAppliesTo, setNewRuleAppliesTo] = useState('publish_workflow')
  const [newBindingPolicyId, setNewBindingPolicyId] = useState('')
  const [newBindingTarget, setNewBindingTarget] = useState<'workflow' | 'environment' | 'architecture'>('workflow')
  const [newBindingValue, setNewBindingValue] = useState('')

  const queryClient = useQueryClient()
  const policiesQuery = useQuery({ queryKey: ['governance-policies'], queryFn: () => listPolicies() })
  const rulesQuery = useQuery({ queryKey: ['governance-approval-rules'], queryFn: () => listApprovalRules() })
  const bindingsQuery = useQuery({ queryKey: ['governance-bindings'], queryFn: () => listBindings() })

  const policies = policiesQuery.data ?? []
  const rules = rulesQuery.data ?? []
  const bindings = bindingsQuery.data ?? []

  const createPolicyMutation = useMutation({
    mutationFn: createPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-policies'] })
      setNewPolicyName('')
    },
  })
  const deletePolicyMutation = useMutation({
    mutationFn: deletePolicy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['governance-policies', 'governance-bindings'] }),
  })
  const createRuleMutation = useMutation({
    mutationFn: createApprovalRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-approval-rules'] })
      setNewRuleName('')
    },
  })
  const deleteRuleMutation = useMutation({
    mutationFn: deleteApprovalRule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['governance-approval-rules'] }),
  })
  const createBindingMutation = useMutation({
    mutationFn: createBinding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-bindings'] })
      setNewBindingPolicyId('')
      setNewBindingValue('')
    },
  })
  const deleteBindingMutation = useMutation({
    mutationFn: deleteBinding,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['governance-bindings'] }),
  })

  function handleCreatePolicy(e: React.FormEvent) {
    e.preventDefault()
    if (!newPolicyName.trim()) return
    createPolicyMutation.mutate({ name: newPolicyName.trim(), scope: newPolicyScope })
  }

  function handleCreateRule(e: React.FormEvent) {
    e.preventDefault()
    if (!newRuleName.trim()) return
    createRuleMutation.mutate({ name: newRuleName.trim(), applies_to: newRuleAppliesTo })
  }

  function handleCreateBinding(e: React.FormEvent) {
    e.preventDefault()
    if (!newBindingPolicyId.trim()) return
    const payload: Parameters<typeof createBinding>[0] = { policy_id: newBindingPolicyId.trim() }
    if (newBindingTarget === 'workflow' && newBindingValue.trim()) payload.workflow_id = newBindingValue.trim()
    else if (newBindingTarget === 'environment' && newBindingValue.trim()) payload.environment_id = newBindingValue.trim()
    else if (newBindingTarget === 'architecture' && newBindingValue.trim()) payload.architecture_type = newBindingValue.trim()
    createBindingMutation.mutate(payload)
  }

  return (
    <div className="gov-page-root">
      <header className="gov-page-header">
        <div>
          <h1>Governance &amp; Guardrails</h1>
          <p>
            Define policy sets, approval rules, and bindings for workflows, environments, and architectures. Used in publish and promotion flows.
          </p>
        </div>
      </header>

      <nav className="gov-tabs">
        <button
          type="button"
          className={tab === 'policies' ? 'gov-tab--active' : ''}
          onClick={() => setTab('policies')}
        >
          Policies
        </button>
        <button
          type="button"
          className={tab === 'approvals' ? 'gov-tab--active' : ''}
          onClick={() => setTab('approvals')}
        >
          Approval rules
        </button>
        <button
          type="button"
          className={tab === 'bindings' ? 'gov-tab--active' : ''}
          onClick={() => setTab('bindings')}
        >
          Bindings
        </button>
      </nav>

      {tab === 'policies' && (
        <section className="gov-section">
          <h2>Policy sets</h2>
          <form onSubmit={handleCreatePolicy} className="gov-form-inline">
            <label>
              <span>Name</span>
              <input
                type="text"
                value={newPolicyName}
                onChange={(e) => setNewPolicyName(e.target.value)}
                placeholder="Policy name"
              />
            </label>
            <label>
              <span>Scope</span>
              <select value={newPolicyScope} onChange={(e) => setNewPolicyScope(e.target.value)}>
                <option value="architecture">Architecture</option>
                <option value="workflow">Workflow</option>
                <option value="environment">Environment</option>
              </select>
            </label>
            <button type="submit" className="gov-btn gov-btn--primary" disabled={createPolicyMutation.isPending || !newPolicyName.trim()}>
              {createPolicyMutation.isPending ? 'Adding…' : 'Add policy'}
            </button>
          </form>
          {policiesQuery.isLoading && <LoadingMessage label="Loading policies…" />}
          {!policiesQuery.isLoading && policies.length === 0 && (
            <EmptyState
              title="No policies"
              description="Add a policy set to apply guardrails to workflows, environments, or architectures."
            />
          )}
          {!policiesQuery.isLoading && policies.length > 0 && (
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Scope</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p: PolicyType) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td><span className="gov-badge">{p.scope}</span></td>
                    <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="gov-btn gov-btn--danger gov-btn--small"
                        onClick={() => deletePolicyMutation.mutate(p.id)}
                        disabled={deletePolicyMutation.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === 'approvals' && (
        <section className="gov-section">
          <h2>Approval gateways</h2>
          <form onSubmit={handleCreateRule} className="gov-form-inline">
            <label>
              <span>Name</span>
              <input
                type="text"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="Rule name"
              />
            </label>
            <label>
              <span>Applies to</span>
              <select value={newRuleAppliesTo} onChange={(e) => setNewRuleAppliesTo(e.target.value)}>
                <option value="publish_workflow">Publish workflow</option>
                <option value="promote_environment">Promote environment</option>
              </select>
            </label>
            <button type="submit" className="gov-btn gov-btn--primary" disabled={createRuleMutation.isPending || !newRuleName.trim()}>
              {createRuleMutation.isPending ? 'Adding…' : 'Add rule'}
            </button>
          </form>
          {rulesQuery.isLoading && <LoadingMessage label="Loading approval rules…" />}
          {!rulesQuery.isLoading && rules.length === 0 && (
            <EmptyState
              title="No approval rules"
              description="Add approval gateways for publish and promotion actions."
            />
          )}
          {!rulesQuery.isLoading && rules.length > 0 && (
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Applies to</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r: ApprovalRuleType) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td><span className="gov-badge">{r.applies_to}</span></td>
                    <td><span className={`gov-badge ${r.active ? 'gov-badge--active' : ''}`}>{r.active ? 'Yes' : 'No'}</span></td>
                    <td>
                      <button
                        type="button"
                        className="gov-btn gov-btn--danger gov-btn--small"
                        onClick={() => deleteRuleMutation.mutate(r.id)}
                        disabled={deleteRuleMutation.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === 'bindings' && (
        <section className="gov-section">
          <h2>Policy bindings</h2>
          <p className="gov-empty">Bind policies to a workflow, environment, or architecture type.</p>
          <form onSubmit={handleCreateBinding} className="gov-form-inline">
            <label>
              <span>Policy</span>
              <select
                value={newBindingPolicyId}
                onChange={(e) => setNewBindingPolicyId(e.target.value)}
              >
                <option value="">Select policy</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Target</span>
              <select value={newBindingTarget} onChange={(e) => setNewBindingTarget(e.target.value as typeof newBindingTarget)}>
                <option value="workflow">Workflow ID</option>
                <option value="environment">Environment ID</option>
                <option value="architecture">Architecture type</option>
              </select>
            </label>
            <label>
              <span>Value</span>
              <input
                type="text"
                value={newBindingValue}
                onChange={(e) => setNewBindingValue(e.target.value)}
                placeholder={newBindingTarget === 'architecture' ? 'e.g. vector' : 'ID'}
              />
            </label>
            <button type="submit" className="gov-btn gov-btn--primary" disabled={createBindingMutation.isPending || !newBindingPolicyId}>
              {createBindingMutation.isPending ? 'Adding…' : 'Add binding'}
            </button>
          </form>
          {bindingsQuery.isLoading && <LoadingMessage label="Loading bindings…" />}
          {!bindingsQuery.isLoading && bindings.length === 0 && (
            <p className="gov-empty">No bindings yet. Add one above (use a policy ID from the Policies tab).</p>
          )}
          {!bindingsQuery.isLoading && bindings.length > 0 && (
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Policy ID</th>
                  <th>Workflow</th>
                  <th>Environment</th>
                  <th>Architecture</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bindings.map((b: BindingType) => (
                  <tr key={b.id}>
                    <td><code style={{ fontSize: '0.8rem' }}>{b.policy_id.slice(0, 8)}…</code></td>
                    <td>{b.workflow_id ?? '—'}</td>
                    <td>{b.environment_id ?? '—'}</td>
                    <td>{b.architecture_type ?? '—'}</td>
                    <td><span className="gov-badge">{b.status}</span></td>
                    <td>
                      <button
                        type="button"
                        className="gov-btn gov-btn--danger gov-btn--small"
                        onClick={() => deleteBindingMutation.mutate(b.id)}
                        disabled={deleteBindingMutation.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  )
}
