from typing import List, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


class EnvironmentConfig(BaseModel):
    id: str
    name: str  # dev, test, staging, prod
    description: str
    integration_bindings: Dict[str, str]  # logical integration id -> concrete integration config id


router = APIRouter()

_ENVIRONMENTS: Dict[str, EnvironmentConfig] = {}


@router.get("/", response_model=List[EnvironmentConfig])
async def list_environments() -> List[EnvironmentConfig]:
    return list(_ENVIRONMENTS.values())


@router.get("/{environment_id}", response_model=EnvironmentConfig)
async def get_environment(environment_id: str) -> EnvironmentConfig:
    env = _ENVIRONMENTS.get(environment_id)
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    return env


@router.post("/", response_model=EnvironmentConfig)
async def create_environment(env: EnvironmentConfig) -> EnvironmentConfig:
    if env.id in _ENVIRONMENTS:
        raise HTTPException(status_code=400, detail="Environment with this id already exists")
    _ENVIRONMENTS[env.id] = env
    return env


@router.put("/{environment_id}", response_model=EnvironmentConfig)
async def update_environment(environment_id: str, env: EnvironmentConfig) -> EnvironmentConfig:
    if environment_id not in _ENVIRONMENTS:
        raise HTTPException(status_code=404, detail="Environment not found")
    _ENVIRONMENTS[environment_id] = env
    return env


@router.delete("/{environment_id}")
async def delete_environment(environment_id: str) -> Dict[str, str]:
    if environment_id not in _ENVIRONMENTS:
        raise HTTPException(status_code=404, detail="Environment not found")
    del _ENVIRONMENTS[environment_id]
    return {"status": "deleted"}

