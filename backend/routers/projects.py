from typing import List

from fastapi import APIRouter
from pydantic import BaseModel


class ProjectEnvironmentTag(BaseModel):
    name: str


class ProjectOwner(BaseModel):
    id: str
    name: str
    role: str


class ProjectConfig(BaseModel):
    id: str
    name: str
    business_domain: str
    use_case_description: str
    environment_tags: List[ProjectEnvironmentTag]
    owners: List[ProjectOwner]
    deployment_status: str
    selected_architecture_type: str
    connected_integrations: List[str]
    active_workflow_version_id: str | None = None


router = APIRouter()


@router.get("/", response_model=List[ProjectConfig])
async def list_projects() -> List[ProjectConfig]:
    # Placeholder in-memory response; to be backed by DB in production.
    return []


@router.post("/", response_model=ProjectConfig)
async def create_project(project: ProjectConfig) -> ProjectConfig:
    # In a real implementation, persist to relational DB and return created entity.
    return project

