"""
Governance API: policy sets, approval rules, bindings.
In-memory store; design is DB-ready for future persistence.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from models_governance import ApprovalRule, GovernanceBinding, GovernancePolicy

router = APIRouter()

_policies: Dict[str, GovernancePolicy] = {}
_approval_rules: Dict[str, ApprovalRule] = {}
_bindings: Dict[str, GovernanceBinding] = {}


def _now() -> str:
    return datetime.utcnow().isoformat() + "Z"


# --- Policy CRUD ---


class PolicyCreate(BaseModel):
    name: str
    scope: str = "workflow"
    rules: Dict[str, Any] = Field(default_factory=dict)
    created_by: Optional[str] = None


class PolicyUpdate(BaseModel):
    name: Optional[str] = None
    scope: Optional[str] = None
    rules: Optional[Dict[str, Any]] = None


@router.get("/policies", response_model=List[GovernancePolicy])
async def list_policies(scope: Optional[str] = None) -> List[GovernancePolicy]:
    out = list(_policies.values())
    if scope:
        out = [p for p in out if p.scope == scope]
    return sorted(out, key=lambda p: p.created_at or "", reverse=True)


@router.get("/policies/{policy_id}", response_model=GovernancePolicy)
async def get_policy(policy_id: str) -> GovernancePolicy:
    if policy_id not in _policies:
        raise HTTPException(status_code=404, detail="Policy not found")
    return _policies[policy_id]


@router.post("/policies", response_model=GovernancePolicy)
async def create_policy(payload: PolicyCreate) -> GovernancePolicy:
    pid = str(uuid4())
    now = _now()
    policy = GovernancePolicy(
        id=pid,
        name=payload.name,
        scope=payload.scope,
        rules=payload.rules,
        created_by=payload.created_by,
        created_at=now,
        updated_at=now,
    )
    _policies[pid] = policy
    return policy


@router.patch("/policies/{policy_id}", response_model=GovernancePolicy)
async def update_policy(policy_id: str, payload: PolicyUpdate) -> GovernancePolicy:
    if policy_id not in _policies:
        raise HTTPException(status_code=404, detail="Policy not found")
    p = _policies[policy_id]
    if payload.name is not None:
        p.name = payload.name
    if payload.scope is not None:
        p.scope = payload.scope
    if payload.rules is not None:
        p.rules = payload.rules
    p.updated_at = _now()
    return p


@router.delete("/policies/{policy_id}", status_code=204)
async def delete_policy(policy_id: str) -> None:
    if policy_id not in _policies:
        raise HTTPException(status_code=404, detail="Policy not found")
    del _policies[policy_id]
    for bid in [b for b, x in _bindings.items() if x.policy_id == policy_id]:
        del _bindings[bid]


# --- Approval rules CRUD ---


class ApprovalRuleCreate(BaseModel):
    name: str
    applies_to: str = "publish_workflow"
    required_roles: List[str] = Field(default_factory=list)
    escalation_path: Dict[str, Any] = Field(default_factory=dict)
    active: bool = True


class ApprovalRuleUpdate(BaseModel):
    name: Optional[str] = None
    applies_to: Optional[str] = None
    required_roles: Optional[List[str]] = None
    escalation_path: Optional[Dict[str, Any]] = None
    active: Optional[bool] = None


@router.get("/approval-rules", response_model=List[ApprovalRule])
async def list_approval_rules(applies_to: Optional[str] = None) -> List[ApprovalRule]:
    out = list(_approval_rules.values())
    if applies_to:
        out = [r for r in out if r.applies_to == applies_to]
    return sorted(out, key=lambda r: r.created_at or "", reverse=True)


@router.get("/approval-rules/{rule_id}", response_model=ApprovalRule)
async def get_approval_rule(rule_id: str) -> ApprovalRule:
    if rule_id not in _approval_rules:
        raise HTTPException(status_code=404, detail="Approval rule not found")
    return _approval_rules[rule_id]


@router.post("/approval-rules", response_model=ApprovalRule)
async def create_approval_rule(payload: ApprovalRuleCreate) -> ApprovalRule:
    rid = str(uuid4())
    now = _now()
    rule = ApprovalRule(
        id=rid,
        name=payload.name,
        applies_to=payload.applies_to,
        required_roles=payload.required_roles,
        escalation_path=payload.escalation_path,
        active=payload.active,
        created_at=now,
        updated_at=now,
    )
    _approval_rules[rid] = rule
    return rule


@router.patch("/approval-rules/{rule_id}", response_model=ApprovalRule)
async def update_approval_rule(rule_id: str, payload: ApprovalRuleUpdate) -> ApprovalRule:
    if rule_id not in _approval_rules:
        raise HTTPException(status_code=404, detail="Approval rule not found")
    r = _approval_rules[rule_id]
    if payload.name is not None:
        r.name = payload.name
    if payload.applies_to is not None:
        r.applies_to = payload.applies_to
    if payload.required_roles is not None:
        r.required_roles = payload.required_roles
    if payload.escalation_path is not None:
        r.escalation_path = payload.escalation_path
    if payload.active is not None:
        r.active = payload.active
    r.updated_at = _now()
    return r


@router.delete("/approval-rules/{rule_id}", status_code=204)
async def delete_approval_rule(rule_id: str) -> None:
    if rule_id not in _approval_rules:
        raise HTTPException(status_code=404, detail="Approval rule not found")
    del _approval_rules[rule_id]


# --- Bindings CRUD ---


class BindingCreate(BaseModel):
    policy_id: str
    workflow_id: Optional[str] = None
    environment_id: Optional[str] = None
    architecture_type: Optional[str] = None
    status: str = "active"


@router.get("/bindings", response_model=List[GovernanceBinding])
async def list_bindings(
    policy_id: Optional[str] = None,
    workflow_id: Optional[str] = None,
    environment_id: Optional[str] = None,
    architecture_type: Optional[str] = None,
) -> List[GovernanceBinding]:
    out = list(_bindings.values())
    if policy_id:
        out = [b for b in out if b.policy_id == policy_id]
    if workflow_id:
        out = [b for b in out if b.workflow_id == workflow_id]
    if environment_id:
        out = [b for b in out if b.environment_id == environment_id]
    if architecture_type:
        out = [b for b in out if b.architecture_type == architecture_type]
    return sorted(out, key=lambda b: b.created_at or "", reverse=True)


@router.post("/bindings", response_model=GovernanceBinding)
async def create_binding(payload: BindingCreate) -> GovernanceBinding:
    if payload.policy_id not in _policies:
        raise HTTPException(status_code=404, detail="Policy not found")
    bid = str(uuid4())
    now = _now()
    binding = GovernanceBinding(
        id=bid,
        policy_id=payload.policy_id,
        workflow_id=payload.workflow_id,
        environment_id=payload.environment_id,
        architecture_type=payload.architecture_type,
        status=payload.status,
        created_at=now,
        updated_at=now,
    )
    _bindings[bid] = binding
    return binding


@router.delete("/bindings/{binding_id}", status_code=204)
async def delete_binding(binding_id: str) -> None:
    if binding_id not in _bindings:
        raise HTTPException(status_code=404, detail="Binding not found")
    del _bindings[binding_id]
