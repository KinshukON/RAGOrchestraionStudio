from typing import List, Dict

from fastapi import APIRouter
from pydantic import BaseModel


class EnvironmentConfig(BaseModel):
    id: str
    name: str  # dev, test, staging, prod
    description: str
    integration_bindings: Dict[str, str]  # logical integration id -> concrete integration config id


router = APIRouter()


@router.get("/", response_model=List[EnvironmentConfig])
async def list_environments() -> List[EnvironmentConfig]:
    return []


@router.post("/", response_model=EnvironmentConfig)
async def create_environment(env: EnvironmentConfig) -> EnvironmentConfig:
    return env

