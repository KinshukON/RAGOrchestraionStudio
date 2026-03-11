from typing import List, Literal, Dict, Any

from fastapi import APIRouter
from pydantic import BaseModel


IntegrationCategory = Literal[
    "llm_provider",
    "embedding_provider",
    "reranker",
    "vector_db",
    "graph_db",
    "sql_db",
    "file_storage",
    "document_repository",
    "enterprise_app",
    "api",
    "identity_provider",
    "logging_monitoring",
]


class IntegrationConfig(BaseModel):
    id: str
    name: str
    provider_type: IntegrationCategory
    credentials_reference: str
    environment_mapping: Dict[str, str]
    default_usage_policies: Dict[str, Any]
    reusable: bool = True
    health_status: str | None = None


router = APIRouter()


@router.get("/", response_model=List[IntegrationConfig])
async def list_integrations() -> List[IntegrationConfig]:
    return []


@router.post("/", response_model=IntegrationConfig)
async def create_integration(integration: IntegrationConfig) -> IntegrationConfig:
    return integration

