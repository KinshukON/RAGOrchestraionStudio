"""
Governance API: policy sets, approval rules, bindings.
Persisted in PostgreSQL via SQLModel + Alembic.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlmodel import select

from models_governance import ApprovalRule, GovernanceBinding, GovernancePolicy
from auth_middleware import TokenPayload, require_auth, require_permission
from db import get_session

router = APIRouter()


# --- Policy CRUD ---


class PolicyCreate(BaseModel):
    name: str
    scope: str = "workflow"
    rules: Dict[str, Any] = Field(default_factory=dict)
    created_by: Optional[int] = None


class PolicyUpdate(BaseModel):
    name: Optional[str] = None
    scope: Optional[str] = None
    rules: Optional[Dict[str, Any]] = None


class PolicyResponse(BaseModel):
    id: int
    name: str
    scope: str
    rules: Dict[str, Any]
    created_by: Optional[int] = None
    created_at: str = ""
    updated_at: str = ""

    @classmethod
    def from_model(cls, m: GovernancePolicy) -> "PolicyResponse":
        return cls(
            id=m.id,
            name=m.name,
            scope=m.scope,
            rules=m.rules or {},
            created_by=m.created_by,
            created_at=m.created_at.isoformat() + "Z" if m.created_at else "",
            updated_at=m.updated_at.isoformat() + "Z" if m.updated_at else "",
        )


@router.get("/policies", response_model=List[PolicyResponse])
async def list_policies(
    scope: Optional[str] = None,
    _user: TokenPayload = Depends(require_auth),
) -> List[PolicyResponse]:
    with get_session() as session:
        stmt = select(GovernancePolicy)
        if scope:
            stmt = stmt.where(GovernancePolicy.scope == scope)
        policies = list(session.exec(stmt).all())
    return sorted(
        [PolicyResponse.from_model(p) for p in policies],
        key=lambda p: p.created_at or "",
        reverse=True,
    )


@router.get("/policies/{policy_id}", response_model=PolicyResponse)
async def get_policy(policy_id: int) -> PolicyResponse:
    with get_session() as session:
        policy = session.get(GovernancePolicy, policy_id)
        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")
        return PolicyResponse.from_model(policy)


@router.post("/policies", response_model=PolicyResponse)
async def create_policy(
    payload: PolicyCreate,
    current_user: TokenPayload = Depends(require_permission("governance:write")),
) -> PolicyResponse:
    now = datetime.utcnow()
    policy = GovernancePolicy(
        name=payload.name,
        scope=payload.scope,
        rules=payload.rules,
        created_by=payload.created_by,
        created_at=now,
        updated_at=now,
    )
    with get_session() as session:
        session.add(policy)
        session.commit()
        session.refresh(policy)
        return PolicyResponse.from_model(policy)


@router.patch("/policies/{policy_id}", response_model=PolicyResponse)
async def update_policy(
    policy_id: int,
    payload: PolicyUpdate,
    current_user: TokenPayload = Depends(require_permission("governance:write")),
) -> PolicyResponse:
    with get_session() as session:
        policy = session.get(GovernancePolicy, policy_id)
        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")
        if payload.name is not None:
            policy.name = payload.name
        if payload.scope is not None:
            policy.scope = payload.scope
        if payload.rules is not None:
            policy.rules = payload.rules
        policy.updated_at = datetime.utcnow()
        session.add(policy)
        session.commit()
        session.refresh(policy)
        return PolicyResponse.from_model(policy)


@router.delete("/policies/{policy_id}", status_code=204)
async def delete_policy(
    policy_id: int,
    _user: TokenPayload = Depends(require_permission("governance:admin")),
):
    with get_session() as session:
        policy = session.get(GovernancePolicy, policy_id)
        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")
        # Cascade-delete related bindings
        bindings = list(session.exec(
            select(GovernanceBinding).where(GovernanceBinding.policy_id == policy_id)
        ).all())
        for b in bindings:
            session.delete(b)
        session.delete(policy)
        session.commit()
    return Response(status_code=204)


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


class ApprovalRuleResponse(BaseModel):
    id: int
    name: str
    applies_to: str
    required_roles: List[str]
    escalation_path: Dict[str, Any]
    active: bool
    created_at: str = ""
    updated_at: str = ""

    @classmethod
    def from_model(cls, m: ApprovalRule) -> "ApprovalRuleResponse":
        return cls(
            id=m.id,
            name=m.name,
            applies_to=m.applies_to,
            required_roles=m.required_roles or [],
            escalation_path=m.escalation_path or {},
            active=m.active,
            created_at=m.created_at.isoformat() + "Z" if m.created_at else "",
            updated_at=m.updated_at.isoformat() + "Z" if m.updated_at else "",
        )


@router.get("/approval-rules", response_model=List[ApprovalRuleResponse])
async def list_approval_rules(applies_to: Optional[str] = None) -> List[ApprovalRuleResponse]:
    with get_session() as session:
        stmt = select(ApprovalRule)
        if applies_to:
            stmt = stmt.where(ApprovalRule.applies_to == applies_to)
        rules = list(session.exec(stmt).all())
    return sorted(
        [ApprovalRuleResponse.from_model(r) for r in rules],
        key=lambda r: r.created_at or "",
        reverse=True,
    )


@router.get("/approval-rules/{rule_id}", response_model=ApprovalRuleResponse)
async def get_approval_rule(rule_id: int) -> ApprovalRuleResponse:
    with get_session() as session:
        rule = session.get(ApprovalRule, rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Approval rule not found")
        return ApprovalRuleResponse.from_model(rule)


@router.post("/approval-rules", response_model=ApprovalRuleResponse)
async def create_approval_rule(
    payload: ApprovalRuleCreate,
    current_user: TokenPayload = Depends(require_permission("governance:write")),
) -> ApprovalRuleResponse:
    now = datetime.utcnow()
    rule = ApprovalRule(
        name=payload.name,
        applies_to=payload.applies_to,
        required_roles=payload.required_roles,
        escalation_path=payload.escalation_path,
        active=payload.active,
        created_at=now,
        updated_at=now,
    )
    with get_session() as session:
        session.add(rule)
        session.commit()
        session.refresh(rule)
        return ApprovalRuleResponse.from_model(rule)


@router.patch("/approval-rules/{rule_id}", response_model=ApprovalRuleResponse)
async def update_approval_rule(rule_id: int, payload: ApprovalRuleUpdate) -> ApprovalRuleResponse:
    with get_session() as session:
        rule = session.get(ApprovalRule, rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Approval rule not found")
        if payload.name is not None:
            rule.name = payload.name
        if payload.applies_to is not None:
            rule.applies_to = payload.applies_to
        if payload.required_roles is not None:
            rule.required_roles = payload.required_roles
        if payload.escalation_path is not None:
            rule.escalation_path = payload.escalation_path
        if payload.active is not None:
            rule.active = payload.active
        rule.updated_at = datetime.utcnow()
        session.add(rule)
        session.commit()
        session.refresh(rule)
        return ApprovalRuleResponse.from_model(rule)


@router.delete("/approval-rules/{rule_id}", status_code=204)
async def delete_approval_rule(rule_id: int):
    with get_session() as session:
        rule = session.get(ApprovalRule, rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Approval rule not found")
        session.delete(rule)
        session.commit()
    return Response(status_code=204)


# --- Bindings CRUD ---


class BindingCreate(BaseModel):
    policy_id: int
    workflow_id: Optional[str] = None
    environment_id: Optional[str] = None
    architecture_type: Optional[str] = None
    status: str = "active"


class BindingResponse(BaseModel):
    id: int
    policy_id: int
    workflow_id: Optional[str] = None
    environment_id: Optional[str] = None
    architecture_type: Optional[str] = None
    status: str = "active"
    created_at: str = ""
    updated_at: str = ""

    @classmethod
    def from_model(cls, m: GovernanceBinding) -> "BindingResponse":
        return cls(
            id=m.id,
            policy_id=m.policy_id,
            workflow_id=m.workflow_id,
            environment_id=m.environment_id,
            architecture_type=m.architecture_type,
            status=m.status,
            created_at=m.created_at.isoformat() + "Z" if m.created_at else "",
            updated_at=m.updated_at.isoformat() + "Z" if m.updated_at else "",
        )


@router.get("/bindings", response_model=List[BindingResponse])
async def list_bindings(
    policy_id: Optional[int] = None,
    workflow_id: Optional[str] = None,
    environment_id: Optional[str] = None,
    architecture_type: Optional[str] = None,
) -> List[BindingResponse]:
    with get_session() as session:
        stmt = select(GovernanceBinding)
        if policy_id:
            stmt = stmt.where(GovernanceBinding.policy_id == policy_id)
        if workflow_id:
            stmt = stmt.where(GovernanceBinding.workflow_id == workflow_id)
        if environment_id:
            stmt = stmt.where(GovernanceBinding.environment_id == environment_id)
        if architecture_type:
            stmt = stmt.where(GovernanceBinding.architecture_type == architecture_type)
        bindings = list(session.exec(stmt).all())
    return sorted(
        [BindingResponse.from_model(b) for b in bindings],
        key=lambda b: b.created_at or "",
        reverse=True,
    )


@router.post("/bindings", response_model=BindingResponse)
async def create_binding(
    payload: BindingCreate,
    current_user: TokenPayload = Depends(require_permission("governance:write")),
) -> BindingResponse:
    with get_session() as session:
        policy = session.get(GovernancePolicy, payload.policy_id)
        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")
        now = datetime.utcnow()
        binding = GovernanceBinding(
            policy_id=payload.policy_id,
            workflow_id=payload.workflow_id,
            environment_id=payload.environment_id,
            architecture_type=payload.architecture_type,
            status=payload.status,
            created_at=now,
            updated_at=now,
        )
        session.add(binding)
        session.commit()
        session.refresh(binding)
        return BindingResponse.from_model(binding)


@router.delete("/bindings/{binding_id}", status_code=204)
async def delete_binding(binding_id: int):
    with get_session() as session:
        binding = session.get(GovernanceBinding, binding_id)
        if not binding:
            raise HTTPException(status_code=404, detail="Binding not found")
        session.delete(binding)
        session.commit()
    return Response(status_code=204)
