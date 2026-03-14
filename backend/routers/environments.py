from typing import Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models_core import Environment as EnvironmentModel
from repositories import EnvironmentRepository


class EnvironmentConfig(BaseModel):
    id: str
    name: str
    description: str
    integration_bindings: Dict[str, str]
    runtime_profile: Dict[str, str] = {}
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


@router.delete("/{environment_id}")
async def delete_environment(environment_id: str) -> Dict[str, str]:
    # Soft-delete not yet implemented; for now, simply indicate unsupported.
    raise HTTPException(status_code=501, detail="Environment deletion not yet supported with persistent storage")

