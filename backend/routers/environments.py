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
    """
    Advance an environment's promotion_status one step along the pipeline:
    draft / not_promoted → pending → promoted

    Governance gate: when promoting to 'promoted' (final step), checks
    the Env Promotion Policy's min_confidence_score against the latest
    WorkflowRun associated with this environment.
    Returns 422 with violations[] if policy thresholds are not met.
    """
    from models_governance import GovernancePolicy as _GovPolicy
    from models_core import WorkflowRun
    from sqlmodel import select as _select
    from db import get_session
    from models_admin import AuditLog as _AuditLog
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

    # ── Governance gate (only enforce on final promotion step → "promoted") ──
    if next_status == "promoted":
        with get_session() as session:
            all_policies = list(session.exec(_select(_GovPolicy)).all())
        env_policies = [p for p in all_policies if p.scope == "environment"]

        # Find latest WorkflowRun referencing this environment
        with get_session() as session:
            runs = list(session.exec(_select(WorkflowRun)).all())
        env_runs = [
            r for r in runs
            if (r.input_payload or {}).get("environment_id") == environment_id
        ]
        env_runs.sort(key=lambda r: r.created_at, reverse=True)

        violations: list[str] = []
        warnings: list[str] = []

        for policy in env_policies:
            rules = policy.rules or {}
            min_score = rules.get("min_confidence_score")
            if min_score is not None and env_runs:
                threshold = float(min_score)
                latest_run = env_runs[0]
                out = latest_run.output_payload or {}
                score: float | None = None
                if "confidence_score" in out:
                    score = float(out["confidence_score"])
                elif "strategies" in out and isinstance(out["strategies"], list) and out["strategies"]:
                    scores = [s.get("confidence_score", 0) for s in out["strategies"]]
                    score = sum(scores) / len(scores)

                if score is not None and score < threshold:
                    violations.append(
                        f'Policy "{policy.name}": environment runs scored '
                        f'{score:.0%} but require ≥ {threshold:.0%} to promote to production.'
                    )
                elif score is not None and score < threshold + 0.05:
                    warnings.append(
                        f'Confidence {score:.0%} is close to the promotion threshold of {threshold:.0%}.'
                    )

        if violations:
            raise HTTPException(
                status_code=422,
                detail={"violations": violations, "warnings": warnings, "blocked": True}
            )

    _env_repo.update_promotion(environment_id, next_status)
    env = _env_repo.get_by_external_id(environment_id)

    # Audit: successful promotion step
    with get_session() as _s:
        _s.add(_AuditLog(
            action="environment.promoted",
            resource_type="environment",
            resource_id=environment_id,
            event_data={"from_status": current, "to_status": next_status},
            ip=None,
        ))
        _s.commit()

    return EnvironmentConfig.from_model(env)  # type: ignore[arg-type]


@router.delete("/{environment_id}")
async def delete_environment(environment_id: str) -> Dict[str, str]:
    raise HTTPException(status_code=501, detail="Environment deletion not yet supported with persistent storage")

