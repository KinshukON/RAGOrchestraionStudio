from typing import Any, Dict, List, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models_core import Integration as IntegrationModel
from repositories import IntegrationRepository


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
    "email",
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

    @classmethod
    def from_model(cls, model: IntegrationModel) -> "IntegrationConfig":
        return cls(
            id=model.external_id,
            name=model.name,
            provider_type=model.provider_type,  # type: ignore[arg-type]
            credentials_reference=model.credentials_reference,
            environment_mapping=model.environment_mapping or {},
            default_usage_policies=model.default_usage_policies or {},
            reusable=model.reusable,
            health_status=model.health_status,
        )


router = APIRouter()
_int_repo = IntegrationRepository()


@router.get("/", response_model=List[IntegrationConfig])
async def list_integrations() -> List[IntegrationConfig]:
    integrations = _int_repo.list_integrations()
    return [IntegrationConfig.from_model(i) for i in integrations]


@router.get("/{integration_id}", response_model=IntegrationConfig)
async def get_integration(integration_id: str) -> IntegrationConfig:
    model = _int_repo.get_by_external_id(integration_id)
    if not model:
        raise HTTPException(status_code=404, detail="Integration not found")
    return IntegrationConfig.from_model(model)


@router.post("/", response_model=IntegrationConfig)
async def create_integration(integration: IntegrationConfig) -> IntegrationConfig:
    created = _int_repo.upsert_from_payload(integration.model_dump())
    return IntegrationConfig.from_model(created)


@router.put("/{integration_id}", response_model=IntegrationConfig)
async def update_integration(integration_id: str, integration: IntegrationConfig) -> IntegrationConfig:
    if integration_id != integration.id:
        raise HTTPException(status_code=400, detail="Integration id mismatch")
    updated = _int_repo.upsert_from_payload(integration.model_dump())
    return IntegrationConfig.from_model(updated)


@router.delete("/{integration_id}")
async def delete_integration(integration_id: str) -> Dict[str, str]:
    # Soft-delete not yet implemented; for now, simply indicate unsupported.
    raise HTTPException(status_code=501, detail="Integration deletion not yet supported with persistent storage")

