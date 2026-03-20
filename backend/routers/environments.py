from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from auth_middleware import require_permission, TokenPayload

from pydantic import BaseModel

from models_core import Environment as EnvironmentModel
from repositories import EnvironmentRepository


# Ordered promotion pipeline
PROMOTION_ORDER = ["draft", "not_promoted", "pending", "promoted"]
PROMOTION_NEXT: Dict[str, str] = {
    "draft":        "pending",
    "not_promoted": "pending",
    "pending":      "promoted",
    "promoted":     "promoted",  # already at top
}


class EnvironmentConfig(BaseModel):
    id: str
    name: str
    description: str
    integration_bindings: Dict[str, str]
    runtime_profile: Dict[str, Any] = {}
    promotion_status: str = "draft"
    approval_state: str | None = None
    health_status: str | None = None

    @classmethod
    def from_model(cls, model: EnvironmentModel) -> "EnvironmentConfig":
        return cls(
            id=model.external_id,
            name=model.name,
            description=model.description,
            integration_bindings=model.integration_bindings or {},
            runtime_profile=getattr(model, "runtime_profile", None) or {},
            promotion_status=getattr(model, "promotion_status", None) or "draft",
            approval_state=getattr(model, "approval_state", None),
            health_status=getattr(model, "health_status", None),
        )


router = APIRouter()
_env_repo = EnvironmentRepository()


@router.get("", response_model=List[EnvironmentConfig])
async def list_environments() -> List[EnvironmentConfig]:
    envs = _env_repo.list_environments()
    return [EnvironmentConfig.from_model(env) for env in envs]


@router.get("/{environment_id}", response_model=EnvironmentConfig)
async def get_environment(environment_id: str) -> EnvironmentConfig:
    env = _env_repo.get_by_external_id(environment_id)
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    return EnvironmentConfig.from_model(env)


@router.post("", response_model=EnvironmentConfig)
async def create_environment(env: EnvironmentConfig) -> EnvironmentConfig:
    created = _env_repo.upsert_from_payload(env.model_dump())
    return EnvironmentConfig.from_model(created)


@router.put("/{environment_id}", response_model=EnvironmentConfig)
async def update_environment(environment_id: str, env: EnvironmentConfig) -> EnvironmentConfig:
    if environment_id != env.id:
        raise HTTPException(status_code=400, detail="Environment id mismatch")
    updated = _env_repo.upsert_from_payload(env.model_dump())
    return EnvironmentConfig.from_model(updated)


@router.post("/{environment_id}/promote", response_model=EnvironmentConfig)
async def promote_environment(
    environment_id: str,
    current_user: TokenPayload = Depends(require_permission("approve_promotions")),
) -> EnvironmentConfig:
    from services.policy_engine import PolicyEngine
    from models_admin import AuditLog as _AuditLog
    from db import get_session
    from rate_limit import enforce_rate_limit

    # Rate-limit: max 5 promote attempts per user per 60 s
    enforce_rate_limit(current_user.user_id, "promote", limit=5, window_seconds=60)

    env = _env_repo.get_by_external_id(environment_id)
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    current = env.promotion_status or "draft"
    if current == "promoted":
        raise HTTPException(status_code=400, detail="Environment is already fully promoted")
    next_status = PROMOTION_NEXT.get(current, "pending")

    # Evaluate dynamic multi-scope governance for all promotions
    evaluation_result = PolicyEngine.evaluate(
        workflow_id="",  # In this context we rely purely on environment-scope logic and architecture defaults
        environment_id=environment_id,
        target_action="promote"
    )

    if evaluation_result.is_blocked:
        with get_session() as _s:
            _s.add(_AuditLog(
                action=evaluation_result.action,
                resource_type="environment",
                resource_id=environment_id,
                event_data=evaluation_result.model_dump(),
                ip=None,
            ))
            _s.commit()
            
        raise HTTPException(
            status_code=422,
            detail={
                "violations": evaluation_result.failed_rules, 
                "warnings": evaluation_result.warnings, 
                "blocked": True,
                "evidence": evaluation_result.evidence_checked,
                "trace": [v.model_dump() for k,v in evaluation_result.rule_trace.items()]
            }
        )

    _env_repo.update_promotion(environment_id, next_status)
    env = _env_repo.get_by_external_id(environment_id)

    # Audit: successful promotion step with full trace provenance
    with get_session() as _s:
        _s.add(_AuditLog(
            action=evaluation_result.action,
            resource_type="environment",
            resource_id=environment_id,
            event_data={
                "from_status": current, 
                "to_status": next_status,
                "trace": evaluation_result.model_dump()
            },
            ip=None,
        ))
        _s.commit()

    return EnvironmentConfig.from_model(env)


@router.delete("/{environment_id}")
async def delete_environment(environment_id: str) -> Dict[str, str]:
    raise HTTPException(status_code=501, detail="Environment deletion not yet supported with persistent storage")

