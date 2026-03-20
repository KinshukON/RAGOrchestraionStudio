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
from models_core import WorkflowDefinition, Environment
from models_admin import AuditLog
from auth_middleware import TokenPayload, require_auth, require_permission
from db import get_session
from services.policy_engine import PolicyEngine

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

# --- Drift Detection ---

class DriftScanReport(BaseModel):
    scanned_workflows: int
    scanned_environments: int
    drifted_workflows: List[str]
    drifted_environments: List[str]

@router.post("/drift-scan", response_model=DriftScanReport)
async def scan_for_policy_drift(
    current_user: TokenPayload = Depends(require_permission("governance:admin")),
) -> DriftScanReport:
    """
    Actively scan all 'active' workflows and 'promoted' environments.
    If they no longer satisfy the dynamically resolved multi-scope policy lattice
    (e.g., confidence scores dropped, new strict rules were added), flag them with drift.
    """
    report = DriftScanReport(
        scanned_workflows=0, scanned_environments=0,
        drifted_workflows=[], drifted_environments=[]
    )
    
    with get_session() as session:
        # 1. Scan active workflows
        active_workflows = list(session.exec(
            select(WorkflowDefinition).where(WorkflowDefinition.status == "active")
        ).all())
        report.scanned_workflows = len(active_workflows)
        
        for wf in active_workflows:
            res = PolicyEngine.evaluate(workflow_id=wf.id, environment_id=None, target_action="publish")
            if res.is_blocked or res.warnings:
                drift_msgs = res.failed_rules + res.warnings
                msg = " | ".join(drift_msgs)
                wf.drift_detected = True
                wf.drift_reason = msg
                report.drifted_workflows.append(wf.id)
                session.add(AuditLog(
                    action="workflow.drift_detected",
                    resource_type="workflow",
                    resource_id=wf.id,
                    event_data={"reason": msg, "trace": [v.model_dump() for k,v in res.rule_trace.items()]},
                    ip=None
                ))
            elif wf.drift_detected:
                # Drift resolved
                wf.drift_detected = False
                wf.drift_reason = None
            session.add(wf)

        # 2. Scan promoted environments (production)
        promoted_envs = list(session.exec(
            select(Environment).where(Environment.promotion_status == "promoted")
        ).all())
        report.scanned_environments = len(promoted_envs)
        
        for env in promoted_envs:
            res = PolicyEngine.evaluate(workflow_id="", environment_id=env.external_id, target_action="promote")
            if res.is_blocked or res.warnings:
                drift_msgs = res.failed_rules + res.warnings
                msg = " | ".join(drift_msgs)
                env.drift_detected = True
                env.drift_reason = msg
                report.drifted_environments.append(env.external_id)
                session.add(AuditLog(
                    action="environment.drift_detected",
                    resource_type="environment",
                    resource_id=env.external_id,
                    event_data={"reason": msg, "trace": [v.model_dump() for k,v in res.rule_trace.items()]},
                    ip=None
                ))
            elif env.drift_detected:
                env.drift_detected = False
                env.drift_reason = None
            session.add(env)

        session.commit()
    return report

# --- Cross-Environment Deltas ---

class CrossEnvDelta(BaseModel):
    rule_key: str
    base_value: Any
    target_value: Any
    stricter_in_target: bool

class DeltaReport(BaseModel):
    base_environment_id: str
    target_environment_id: str
    deltas: List[CrossEnvDelta]

@router.get("/deltas", response_model=DeltaReport)
async def cross_environment_policy_deltas(
    base_env: str,
    target_env: str,
    _user: TokenPayload = Depends(require_auth)
) -> DeltaReport:
    """
    Compare the resolved policy lattice between two environments (e.g., Staging vs Prod).
    Highlights rules that are stricter in the target environment.
    """
    def _resolve_env_rules(env_id: str) -> Dict[str, Any]:
        with get_session() as session:
            all_policies = list(session.exec(select(GovernancePolicy)).all())
            all_bindings = list(session.exec(select(GovernanceBinding).where(GovernanceBinding.status == "active")).all())
            
            env_rules = {}
            # Apply Environment-level limits based on bindings
            bound_policies = [p for p in all_policies if p.id in [b.policy_id for b in all_bindings if b.environment_id == env_id or b.environment_id == "*"]]
            for p in bound_policies:
                env_rules.update(p.rules or {})
            return env_rules

    base_rules = _resolve_env_rules(base_env)
    target_rules = _resolve_env_rules(target_env)
    
    deltas = []
    all_keys = set(base_rules.keys()) | set(target_rules.keys())
    
    for key in all_keys:
        b_val = base_rules.get(key)
        t_val = target_rules.get(key)
        
        if b_val != t_val:
            stricter = False
            if key == "min_confidence_score" or key == "min_evaluation_runs":
                bb = float(b_val) if b_val is not None else 0.0
                tt = float(t_val) if t_val is not None else 0.0
                stricter = tt > bb
            elif key == "pii_redaction_required":
                stricter = bool(t_val) and not bool(b_val)
            elif key == "promotion_class":
                # simplistic strictness: human_review_required > production_blocked > production_allowed_with_monitoring > staging_allowed > sandbox_only
                strictness_map = {
                    "human_review_required": 5, "production_blocked": 4, 
                    "production_allowed_with_monitoring": 3, "staging_allowed": 2, "sandbox_only": 1
                }
                stricter = strictness_map.get(str(t_val), 0) > strictness_map.get(str(b_val), 0)

            deltas.append(CrossEnvDelta(
                rule_key=key,
                base_value=b_val,
                target_value=t_val,
                stricter_in_target=stricter
            ))
            
    return DeltaReport(
        base_environment_id=base_env,
        target_environment_id=target_env,
        deltas=deltas
    )
