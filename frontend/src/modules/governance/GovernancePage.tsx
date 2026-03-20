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
  updatePolicy,
  deletePolicy,
  listApprovalRules,
  createApprovalRule,
  updateApprovalRule,
  deleteApprovalRule,
  listBindings,
  createBinding,
  deleteBinding,
} from '../../api/governance'
import { EmptyState, LoadingMessage } from '../ui/feedback'
import { useToast } from '../ui/ToastContext'
import './governance.css'

type Tab = 'policies' | 'approvals' | 'bindings'

export function GovernancePage() {
  const { success, error } = useToast()
  const [tab, setTab] = useState<Tab>('policies')

  // === POLICIES STATE ===
  const [editingPolicyId, setEditingPolicyId] = useState<string | number | null>(null)
  const [policyName, setPolicyName] = useState('')
  const [policyScope, setPolicyScope] = useState('workflow')
  
  // Builder toggle
  const [policyMode, setPolicyMode] = useState<'visual' | 'json'>('visual')
  const [policyRawJson, setPolicyRawJson] = useState('{\n  \n}')
  
  // Visual Builder State
  const [vMinScore, setVMinScore] = useState<string>('0.75')
  const [vMinRuns, setVMinRuns] = useState<string>('')
  const [vPii, setVPii] = useState(false)
  const [vTopics, setVTopics] = useState('')
  const [vPromotionClass, setVPromotionClass] = useState('production_allowed_with_monitoring')
  const [vArchProfile, setVArchProfile] = useState('none')
  const [vArchRule, setVArchRule] = useState('')

  // === APPROVAL RULES STATE ===
  const [editingRuleId, setEditingRuleId] = useState<string | number | null>(null)
  const [ruleName, setRuleName] = useState('')
  const [ruleAppliesTo, setRuleAppliesTo] = useState('publish_workflow')
  const [ruleRoles, setRuleRoles] = useState('')
  const [ruleActive, setRuleActive] = useState(true)
  
  // Builder toggle
  const [ruleMode, setRuleMode] = useState<'visual' | 'json'>('visual')
  const [ruleRawJson, setRuleRawJson] = useState('{\n  \n}')
  
  // Visual EscState
  const [vTimeout, setVTimeout] = useState('48')
  const [vEscalateTo, setVEscalateTo] = useState('admin')
  const [vApprovalType, setVApprovalType] = useState('parallel')
  const [vAuditBlock, setVAuditBlock] = useState(true)

  // === BINDINGS STATE ===
  const [newBindingPolicyId, setNewBindingPolicyId] = useState('')
  const [newBindingTarget, setNewBindingTarget] = useState<'workflow' | 'environment' | 'architecture'>('workflow')
  const [newBindingValue, setNewBindingValue] = useState('')
  const [newBindingStatus, setNewBindingStatus] = useState('active')

  const queryClient = useQueryClient()
  const policiesQuery = useQuery({ queryKey: ['governance-policies'], queryFn: () => listPolicies() })
  const rulesQuery = useQuery({ queryKey: ['governance-approval-rules'], queryFn: () => listApprovalRules() })
  const bindingsQuery = useQuery({ queryKey: ['governance-bindings'], queryFn: () => listBindings() })

  const policies = policiesQuery.data ?? []
  const rules = rulesQuery.data ?? []
  const bindings = bindingsQuery.data ?? []

  // --- MUTATIONS: POLICIES ---
  const createPolicyMutation = useMutation({
    mutationFn: createPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-policies'] })
      resetPolicyForm()
      success('Policy created')
    },
    onError: () => error('Failed to create policy'),
  })
  
  const updatePolicyMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string | number, payload: any }) => updatePolicy(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-policies'] })
      resetPolicyForm()
      success('Policy updated')
    },
    onError: () => error('Failed to update policy'),
  })

  const deletePolicyMutation = useMutation({
    mutationFn: deletePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-policies', 'governance-bindings'] })
      success('Policy deleted')
    },
    onError: () => error('Failed to delete policy'),
  })

  // --- MUTATIONS: RULES ---
  const createRuleMutation = useMutation({
    mutationFn: createApprovalRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-approval-rules'] })
      resetRuleForm()
      success('Approval rule created')
    },
    onError: () => error('Failed to create rule'),
  })

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string | number, payload: any }) => updateApprovalRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-approval-rules'] })
      resetRuleForm()
      success('Rule updated')
    },
    onError: () => error('Failed to update rule'),
  })

  const deleteRuleMutation = useMutation({
    mutationFn: deleteApprovalRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-approval-rules'] })
      success('Rule deleted')
    },
    onError: () => error('Failed to delete rule'),
  })

  // --- MUTATIONS: BINDINGS ---
  const createBindingMutation = useMutation({
    mutationFn: createBinding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-bindings'] })
      setNewBindingPolicyId('')
      setNewBindingValue('')
      setNewBindingStatus('active')
      success('Binding created')
    },
    onError: () => error('Failed to create binding'),
  })

  const deleteBindingMutation = useMutation({
    mutationFn: deleteBinding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-bindings'] })
      success('Binding deleted')
    },
    onError: () => error('Failed to delete binding'),
  })

  // === HELPERS & HANDLERS ===
  function resetPolicyForm() {
    setEditingPolicyId(null)
    setPolicyName('')
    setPolicyScope('workflow')
    setPolicyRawJson('{\n  \n}')
    setPolicyMode('visual')
    setVMinScore('0.75')
    setVMinRuns('')
    setVPii(false)
    setVTopics('')
    setVPromotionClass('production_allowed_with_monitoring')
    setVArchProfile('none')
    setVArchRule('')
  }

  function resetRuleForm() {
    setEditingRuleId(null)
    setRuleName('')
    setRuleRoles('')
    setRuleRawJson('{\n  \n}')
    setRuleActive(true)
    setRuleMode('visual')
    setVTimeout('48')
    setVEscalateTo('admin')
    setVApprovalType('parallel')
    setVAuditBlock(true)
  }

  function getCompiledPolicyRules() {
    if (policyMode === 'json') {
      return JSON.parse(policyRawJson)
    }
    const compiled: any = {
      promotion_class: vPromotionClass,
      evidence_gates: {}
    }
    if (vMinScore) compiled.evidence_gates.min_confidence_score = parseFloat(vMinScore)
    if (vMinRuns) compiled.evidence_gates.min_evaluation_runs = parseInt(vMinRuns, 10)
    if (vPii) compiled.pii_redaction_required = true
    if (vTopics) compiled.blocked_topics = vTopics.split(',').map(s => s.trim()).filter(Boolean)
    
    if (vArchProfile !== 'none') {
      compiled.architecture_profile = {
        type: vArchProfile,
        enforce: vArchRule
      }
    }
    return compiled
  }

  function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault()
    if (!policyName.trim()) return

    let parsedRules = {}
    try {
      parsedRules = getCompiledPolicyRules()
    } catch (err) {
      error('Invalid JSON configuration')
      return
    }

    const payload = { name: policyName.trim(), scope: policyScope, rules: parsedRules }
    
    if (editingPolicyId) {
      updatePolicyMutation.mutate({ id: editingPolicyId, payload })
    } else {
      createPolicyMutation.mutate(payload)
    }
  }

  function getCompiledEscalation() {
    if (ruleMode === 'json') {
      return JSON.parse(ruleRawJson)
    }
    const compiled: any = {
      approval_type: vApprovalType,
      timeout_hours: parseInt(vTimeout || '0', 10),
      escalate_to: vEscalateTo,
      require_audit_snapshot_on_block: vAuditBlock
    }
    return compiled
  }

  function handleSaveRule(e: React.FormEvent) {
    e.preventDefault()
    if (!ruleName.trim()) return

    const rolesList = ruleRoles.split(',').map(r => r.trim()).filter(Boolean)
    
    let parsedEsc = {}
    try {
      parsedEsc = getCompiledEscalation()
    } catch (err) {
      error('Invalid JSON configuration')
      return
    }

    const payload = { 
      name: ruleName.trim(), 
      applies_to: ruleAppliesTo,
      required_roles: rolesList,
      escalation_path: parsedEsc,
      active: ruleActive
    }

    if (editingRuleId) {
      updateRuleMutation.mutate({ id: editingRuleId, payload })
    } else {
      createRuleMutation.mutate(payload)
    }
  }

  function handleCreateBinding(e: React.FormEvent) {
    e.preventDefault()
    if (!newBindingPolicyId.trim()) return
    const payload: Parameters<typeof createBinding>[0] = { policy_id: newBindingPolicyId.trim(), status: newBindingStatus }
    if (newBindingTarget === 'workflow' && newBindingValue.trim()) payload.workflow_id = newBindingValue.trim()
    else if (newBindingTarget === 'environment' && newBindingValue.trim()) payload.environment_id = newBindingValue.trim()
    else if (newBindingTarget === 'architecture' && newBindingValue.trim()) payload.architecture_type = newBindingValue.trim()
    createBindingMutation.mutate(payload)
  }

  function loadIndustryPack(pack: string) {
    setPolicyMode('visual')
    if (pack === 'finance') {
      setPolicyName('Financial Services Baseline')
      setVMinScore('0.95')
      setVMinRuns('10')
      setVPii(true)
      setVTopics('financial_advice, stock_picking')
      setVPromotionClass('human_review_required')
      setVArchProfile('hybrid')
      setVArchRule('branch-level trace explainability')
    } else if (pack === 'cyber') {
      setPolicyName('Cybersecurity Strict Mode')
      setVMinScore('0.90')
      setVMinRuns('5')
      setVPii(false)
      setVTopics('exploit_generation')
      setVPromotionClass('production_allowed_with_monitoring')
      setVArchProfile('agentic')
      setVArchRule('tool-call guardrails and action whitelists')
    }
  }

  function editPolicy(p: PolicyType, isDuplicate = false) {
    setEditingPolicyId(isDuplicate ? null : p.id)
    setPolicyName(p.name + (isDuplicate ? ' (Copy)' : ''))
    setPolicyScope(p.scope || 'workflow')
    setPolicyMode('json')
    setPolicyRawJson(JSON.stringify(p.rules, null, 2))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function editRule(r: ApprovalRuleType, isDuplicate = false) {
    setEditingRuleId(isDuplicate ? null : r.id)
    setRuleName(r.name + (isDuplicate ? ' (Copy)' : ''))
    setRuleAppliesTo(r.applies_to || 'publish_workflow')
    setRuleRoles((r.required_roles || []).join(', '))
    setRuleActive(r.active)
    setRuleMode('json')
    setRuleRawJson(JSON.stringify(r.escalation_path, null, 2))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="gov-page-root">
      <header className="gov-page-header">
        <div>
          <h1>Governance &amp; Guardrails</h1>
          <p>
            Define multi-scope policy inheritance, objective evidence-aware release gates, and strict RBAC approvals.
          </p>
        </div>
      </header>

      <nav className="gov-tabs">
        <button type="button" className={tab === 'policies' ? 'gov-tab--active' : ''} onClick={() => setTab('policies')}>
          Policies
        </button>
        <button type="button" className={tab === 'approvals' ? 'gov-tab--active' : ''} onClick={() => setTab('approvals')}>
          Approval rules
        </button>
        <button type="button" className={tab === 'bindings' ? 'gov-tab--active' : ''} onClick={() => setTab('bindings')}>
          Bindings
        </button>
      </nav>

      {tab === 'policies' && (
        <section className="gov-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{editingPolicyId ? 'Edit policy' : 'Create policy set'}</h2>
            {!editingPolicyId && (
              <div className="gov-pack-dropdown">
                <select onChange={(e) => { if(e.target.value) loadIndustryPack(e.target.value); e.target.value = '' }}>
                  <option value="">Load Industry Pack...</option>
                  <option value="finance">Financial Services</option>
                  <option value="cyber">Cybersecurity</option>
                </select>
              </div>
            )}
          </div>
          
          <form onSubmit={handleSavePolicy} className="gov-form-advanced">
            <div className="gov-split-row">
              <label>
                <span>Policy Name</span>
                <input type="text" value={policyName} onChange={(e) => setPolicyName(e.target.value)} placeholder="e.g. Strict Guardrails" />
              </label>
              <label>
                <span>Inheritance Scope</span>
                <select value={policyScope} onChange={(e) => setPolicyScope(e.target.value)}>
                  <option value="architecture">Architecture baseline</option>
                  <option value="workflow">Workflow override</option>
                  <option value="environment">Environment bounds</option>
                </select>
              </label>
            </div>

            <div className="gov-builder-toggle">
              <button type="button" className={policyMode === 'visual' ? 'active' : ''} onClick={() => setPolicyMode('visual')}>Visual Builder</button>
              <button type="button" className={policyMode === 'json' ? 'active' : ''} onClick={() => setPolicyMode('json')}>JSON Editor</button>
            </div>

            {policyMode === 'visual' ? (
              <div className="gov-visual-builder">
                <div className="vbuilder-col">
                  <h4>Evidence-Aware Gates</h4>
                  <label>
                    <span className="tiny-lbl">Min Readiness / Eval Score</span>
                    <input type="number" step="0.01" value={vMinScore} onChange={e => setVMinScore(e.target.value)} />
                  </label>
                  <label>
                    <span className="tiny-lbl">Min Evaluation Runs</span>
                    <input type="number" value={vMinRuns} onChange={e => setVMinRuns(e.target.value)} />
                  </label>
                  <label className="gov-checkbox-label" style={{marginTop: '0.8rem'}}>
                    <input type="checkbox" checked={vPii} onChange={e => setVPii(e.target.checked)} />
                    <span>Enforce PII Redaction Filters</span>
                  </label>
                  <label style={{marginTop: '0.5rem'}}>
                    <span className="tiny-lbl">Blocked Topics</span>
                    <input type="text" value={vTopics} onChange={e => setVTopics(e.target.value)} placeholder="hate_speech, medical" />
                  </label>
                </div>

                <div className="vbuilder-col">
                  <h4>Lifecycle &amp; Architecture</h4>
                  <label>
                    <span className="tiny-lbl">Promotion Class</span>
                    <select value={vPromotionClass} onChange={e => setVPromotionClass(e.target.value)}>
                      <option value="sandbox_only">Sandbox only</option>
                      <option value="staging_allowed">Staging allowed</option>
                      <option value="production_allowed_with_monitoring">Production (with Monitoring)</option>
                      <option value="production_blocked">Production Blocked</option>
                      <option value="human_review_required">Human Review Required</option>
                    </select>
                  </label>
                  
                  <div className="arch-box">
                    <label>
                      <span className="tiny-lbl">Governance Profile</span>
                      <select value={vArchProfile} onChange={e => setVArchProfile(e.target.value)}>
                        <option value="none">Standard Profile</option>
                        <option value="graph">Graph RAG</option>
                        <option value="hybrid">Hybrid RAG</option>
                        <option value="vectorless">Vectorless</option>
                        <option value="agentic">Agentic RAG</option>
                      </select>
                    </label>
                    {vArchProfile !== 'none' && (
                      <label style={{marginTop: '0.5rem'}}>
                        <span className="tiny-lbl">Rule Enforcements</span>
                        <input type="text" value={vArchRule} onChange={e => setVArchRule(e.target.value)} placeholder="explainability threshold" />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <label className="gov-field-full">
                <textarea
                  value={policyRawJson}
                  onChange={(e) => setPolicyRawJson(e.target.value)}
                  placeholder='{"min_confidence_score": 0.75}'
                  rows={6}
                />
              </label>
            )}

            <div className="gov-form-actions">
              <button type="submit" className="gov-btn gov-btn--primary" disabled={updatePolicyMutation.isPending || createPolicyMutation.isPending || !policyName.trim()}>
                {editingPolicyId ? 'Update Policy' : 'Create Policy'}
              </button>
              {editingPolicyId && (
                <button type="button" className="gov-btn gov-btn--ghost" onClick={resetPolicyForm}>Cancel</button>
              )}
            </div>
          </form>

          {policiesQuery.isLoading && <LoadingMessage label="Loading policies…" />}
          {!policiesQuery.isLoading && policies.length === 0 && (
            <EmptyState title="No policies" description="Add a policy set to apply evidence-aware governance." />
          )}
          {!policiesQuery.isLoading && policies.length > 0 && (
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Scope</th>
                  <th>Rules</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p: PolicyType) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td><span className="gov-badge">{p.scope}</span></td>
                    <td><span className="gov-code-snippet">{p.rules ? Object.keys(p.rules).length : 0} nodes</span></td>
                    <td>
                      <div className="gov-row-actions">
                        <button type="button" className="gov-btn gov-btn--ghost gov-btn--small" onClick={() => editPolicy(p, false)}>Edit</button>
                        <button type="button" className="gov-btn gov-btn--ghost gov-btn--small" onClick={() => editPolicy(p, true)}>Duplicate</button>
                        <button type="button" className="gov-btn gov-btn--danger gov-btn--small" onClick={() => deletePolicyMutation.mutate(p.id)}>Delete</button>
                      </div>
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
          <h2>{editingRuleId ? 'Edit approval gateway' : 'Create approval gateway'}</h2>
          
          <form onSubmit={handleSaveRule} className="gov-form-advanced">
            <div className="gov-split-row">
              <label>
                <span>Gateway Name</span>
                <input type="text" value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="e.g. Legal Sign-off" />
              </label>
              <label>
                <span>Lifecycle Hook</span>
                <select value={ruleAppliesTo} onChange={(e) => setRuleAppliesTo(e.target.value)}>
                  <option value="publish_workflow">Publish to Catalog</option>
                  <option value="promote_environment">Promote to Prod</option>
                </select>
              </label>
            </div>
            
            <label className="gov-field-full">
              <span>Required Roles (RBAC Gates)</span>
              <input type="text" value={ruleRoles} onChange={(e) => setRuleRoles(e.target.value)} placeholder="Platform Admin, Executive Reviewer" />
            </label>

            <div className="gov-builder-toggle">
              <button type="button" className={ruleMode === 'visual' ? 'active' : ''} onClick={() => setRuleMode('visual')}>Visual Esc. Path</button>
              <button type="button" className={ruleMode === 'json' ? 'active' : ''} onClick={() => setRuleMode('json')}>JSON Editor</button>
            </div>

            {ruleMode === 'visual' ? (
              <div className="gov-visual-builder">
                <div className="vbuilder-col">
                  <label>
                    <span className="tiny-lbl">Consensus Type</span>
                    <select value={vApprovalType} onChange={e => setVApprovalType(e.target.value)}>
                      <option value="parallel">Parallel (Any can approve)</option>
                      <option value="sequential">Sequential Sign-offs</option>
                    </select>
                  </label>
                  <label className="gov-checkbox-label" style={{marginTop: '1rem'}}>
                    <input type="checkbox" checked={vAuditBlock} onChange={e => setVAuditBlock(e.target.checked)} />
                    <span>Generate Snapshot Provenance on Block</span>
                  </label>
                </div>
                <div className="vbuilder-col">
                  <label>
                    <span className="tiny-lbl">Timeout (Hours)</span>
                    <input type="number" value={vTimeout} onChange={e => setVTimeout(e.target.value)} />
                  </label>
                  <label>
                    <span className="tiny-lbl">Fallback Action / Escalate To</span>
                    <input type="text" value={vEscalateTo} onChange={e => setVEscalateTo(e.target.value)} />
                  </label>
                </div>
              </div>
            ) : (
              <label className="gov-field-full">
                <textarea value={ruleRawJson} onChange={(e) => setRuleRawJson(e.target.value)} rows={4} />
              </label>
            )}

            <label className="gov-checkbox-label" style={{marginTop: '0.5rem', marginBottom: '1rem'}}>
              <input type="checkbox" checked={ruleActive} onChange={(e) => setRuleActive(e.target.checked)} />
              <span style={{fontWeight: 600}}>Gateway Active</span>
            </label>

            <div className="gov-form-actions">
              <button type="submit" className="gov-btn gov-btn--primary" disabled={updateRuleMutation.isPending || createRuleMutation.isPending || !ruleName.trim()}>
                {editingRuleId ? 'Update Gateway' : 'Add Gateway'}
              </button>
              {editingRuleId && (
                <button type="button" className="gov-btn gov-btn--ghost" onClick={resetRuleForm}>Cancel</button>
              )}
            </div>
          </form>

          {rulesQuery.isLoading && <LoadingMessage label="Loading gateways…" />}
          {!rulesQuery.isLoading && rules.length === 0 && <EmptyState title="No approval gateways" description="" />}
          {!rulesQuery.isLoading && rules.length > 0 && (
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Hook</th>
                  <th>Roles</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r: ApprovalRuleType) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td><span className="gov-badge">{r.applies_to}</span></td>
                    <td>{r.required_roles?.length ? r.required_roles.join(', ') : '—'}</td>
                    <td><span className={`gov-badge ${r.active ? 'gov-badge--active' : ''}`}>{r.active ? 'Yes' : 'No'}</span></td>
                    <td>
                      <div className="gov-row-actions">
                        <button type="button" className="gov-btn gov-btn--ghost gov-btn--small" onClick={() => editRule(r, false)}>Edit</button>
                        <button type="button" className="gov-btn gov-btn--ghost gov-btn--small" onClick={() => editRule(r, true)}>Duplicate</button>
                        <button type="button" className="gov-btn gov-btn--danger gov-btn--small" onClick={() => deleteRuleMutation.mutate(r.id)}>Delete</button>
                      </div>
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
          <h2>Policy Bindings</h2>
          <p className="gov-empty">Attach policies universally or to specific dimensions.</p>
          <form onSubmit={handleCreateBinding} className="gov-form-inline">
            <label>
              <span>Policy</span>
              <select value={newBindingPolicyId} onChange={(e) => setNewBindingPolicyId(e.target.value)}>
                <option value="">Select policy...</option>
                {policies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label>
              <span>Target</span>
              <select value={newBindingTarget} onChange={(e) => setNewBindingTarget(e.target.value as any)}>
                <option value="workflow">Workflow ID</option>
                <option value="environment">Environment ID</option>
                <option value="architecture">Architecture profile</option>
              </select>
            </label>
            <label>
              <span>Value</span>
              <input type="text" value={newBindingValue} onChange={(e) => setNewBindingValue(e.target.value)} placeholder="Target ID" />
            </label>
            <label>
              <span>Status</span>
              <select value={newBindingStatus} onChange={(e) => setNewBindingStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Suspended</option>
              </select>
            </label>
            <button type="submit" className="gov-btn gov-btn--primary" disabled={createBindingMutation.isPending || !newBindingPolicyId.trim()}>
              Add Binding
            </button>
          </form>
          {bindingsQuery.isLoading && <LoadingMessage label="Loading…" />}
          {!bindingsQuery.isLoading && bindings.length > 0 && (
            <table className="gov-table" style={{marginTop: '2rem'}}>
              <thead>
                <tr>
                  <th>Policy ID</th>
                  <th>Target Type</th>
                  <th>Target ID</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bindings.map((b: BindingType) => {
                  let tgt = 'Global'
                  let val = '—'
                  if (b.workflow_id) { tgt = 'Workflow'; val = b.workflow_id }
                  else if (b.environment_id) { tgt = 'Environment'; val = b.environment_id }
                  else if (b.architecture_type) { tgt = 'Architecture'; val = b.architecture_type }
                  return (
                    <tr key={b.id}>
                      <td><code style={{ fontSize: '0.8rem' }}>{String(b.policy_id).slice(0, 8)}</code></td>
                      <td><span className="gov-badge">{tgt}</span></td>
                      <td>{val}</td>
                      <td><span className={`gov-badge ${b.status === 'active' ? 'gov-badge--active' : ''}`}>{b.status}</span></td>
                      <td>
                        <button type="button" className="gov-btn gov-btn--danger gov-btn--small" onClick={() => deleteBindingMutation.mutate(b.id)}>Delete</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  )
}
