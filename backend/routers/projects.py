from typing import List

from fastapi import APIRouter
from pydantic import BaseModel

from models_core import Project
from repositories import ProjectRepository


class ProjectConfig(BaseModel):
    id: int
    name: str
    business_domain: str
    use_case_description: str
    deployment_status: str
    selected_architecture_type: str

    @classmethod
    def from_model(cls, model: Project) -> "ProjectConfig":
        return cls(
            id=model.id or 0,
            name=model.name,
            business_domain=model.business_domain,
            use_case_description=model.use_case_description,
            deployment_status=model.deployment_status,
            selected_architecture_type=model.selected_architecture_type,
        )


router = APIRouter()
_projects_repo = ProjectRepository()


@router.get("/", response_model=List[ProjectConfig])
async def list_projects() -> List[ProjectConfig]:
    projects = _projects_repo.list_projects()
    return [ProjectConfig.from_model(p) for p in projects]


@router.post("/", response_model=ProjectConfig)
async def create_project(project: ProjectConfig) -> ProjectConfig:
    created = _projects_repo.create_project(
        Project(
            name=project.name,
            business_domain=project.business_domain,
            use_case_description=project.use_case_description,
            deployment_status=project.deployment_status,
            selected_architecture_type=project.selected_architecture_type,
        )
    )
    return ProjectConfig.from_model(created)

