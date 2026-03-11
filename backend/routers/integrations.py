from typing import List, Literal, Dict, Any

from fastapi import APIRouter, HTTPException
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

_INTEGRATIONS: Dict[str, IntegrationConfig] = {}


@router.get("/", response_model=List[IntegrationConfig])
async def list_integrations() -> List[IntegrationConfig]:
  return list(_INTEGRATIONS.values())


@router.get("/{integration_id}", response_model=IntegrationConfig)
async def get_integration(integration_id: str) -> IntegrationConfig:
  integration = _INTEGRATIONS.get(integration_id)
  if not integration:
      raise HTTPException(status_code=404, detail="Integration not found")
  return integration


@router.post("/", response_model=IntegrationConfig)
async def create_integration(integration: IntegrationConfig) -> IntegrationConfig:
  if integration.id in _INTEGRATIONS:
      raise HTTPException(status_code=400, detail="Integration with this id already exists")
  _INTEGRATIONS[integration.id] = integration
  return integration


@router.put("/{integration_id}", response_model=IntegrationConfig)
async def update_integration(integration_id: str, integration: IntegrationConfig) -> IntegrationConfig:
  if integration_id not in _INTEGRATIONS:
      raise HTTPException(status_code=404, detail="Integration not found")
  _INTEGRATIONS[integration_id] = integration
  return integration


@router.delete("/{integration_id}")
async def delete_integration(integration_id: str) -> Dict[str, str]:
  if integration_id not in _INTEGRATIONS:
      raise HTTPException(status_code=404, detail="Integration not found")
  del _INTEGRATIONS[integration_id]
  return {"status": "deleted"}

