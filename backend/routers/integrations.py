import random
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

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
    # legacy provider_type values used by demo seed (kept for backwards compat)
    "embedding",
    "llm",
    "storage",
    "observability",
]


class IntegrationConfig(BaseModel):
    id: str
    name: str
    provider_type: str
    credentials_reference: str
    environment_mapping: Dict[str, str]
    default_usage_policies: Dict[str, Any]
    reusable: bool = True
    health_status: str | None = None
    last_tested_at: Optional[str] = None  # ISO timestamp or None

    @classmethod
    def from_model(cls, model: IntegrationModel) -> "IntegrationConfig":
        return cls(
            id=model.external_id,
            name=model.name,
            provider_type=model.provider_type,
            credentials_reference=model.credentials_reference,
            environment_mapping=model.environment_mapping or {},
            default_usage_policies=model.default_usage_policies or {},
            reusable=model.reusable,
            health_status=model.health_status,
            last_tested_at=model.last_tested_at.isoformat() if model.last_tested_at else None,
        )


router = APIRouter()
_int_repo = IntegrationRepository()

# Simulated latency buckets (ms) per provider type — realistic but fake
_LATENCY_MS: Dict[str, int] = {
    "llm": 320, "llm_provider": 320,
    "embedding": 95, "embedding_provider": 95,
    "reranker": 140,
    "vector_db": 28,
    "graph_db": 55,
    "sql_db": 12,
    "storage": 45, "file_storage": 45,
    "observability": 18, "logging_monitoring": 18,
}
# integrations whose health should stay "degraded" after a test
_DEGRADED_NAMES = {"cohere reranker", "cohere"}


@router.get("", response_model=List[IntegrationConfig])
async def list_integrations() -> List[IntegrationConfig]:
    integrations = _int_repo.list_integrations()
    return [IntegrationConfig.from_model(i) for i in integrations]


@router.get("/{integration_id}", response_model=IntegrationConfig)
async def get_integration(integration_id: str) -> IntegrationConfig:
    model = _int_repo.get_by_external_id(integration_id)
    if not model:
        raise HTTPException(status_code=404, detail="Integration not found")
    return IntegrationConfig.from_model(model)


@router.post("", response_model=IntegrationConfig)
async def create_integration(integration: IntegrationConfig) -> IntegrationConfig:
    created = _int_repo.upsert_from_payload(integration.model_dump())
    return IntegrationConfig.from_model(created)


@router.put("/{integration_id}", response_model=IntegrationConfig)
async def update_integration(integration_id: str, integration: IntegrationConfig) -> IntegrationConfig:
    if integration_id != integration.id:
        raise HTTPException(status_code=400, detail="Integration id mismatch")
    updated = _int_repo.upsert_from_payload(integration.model_dump())
    return IntegrationConfig.from_model(updated)


@router.post("/{integration_id}/test")
async def test_connection(integration_id: str) -> Dict[str, Any]:
    """
    Simulate a connection test for an integration.
    - Persists health_status and last_tested_at to the DB.
    - Returns latency_ms, status, and a message.
    - Degraded integrations (e.g. Cohere Reranker) stay degraded.
    """
    model = _int_repo.get_by_external_id(integration_id)
    if not model:
        raise HTTPException(status_code=404, detail="Integration not found")

    is_degraded = model.name.lower() in _DEGRADED_NAMES
    base_latency = _LATENCY_MS.get(model.provider_type, 80)
    # Add ±20% jitter
    latency = int(base_latency * random.uniform(0.8, 1.2))
    status = "degraded" if is_degraded else "healthy"
    message = (
        f"Connection degraded — elevated error rate detected ({latency} ms)"
        if is_degraded
        else f"Connection healthy — round-trip {latency} ms"
    )

    # Persist result
    _int_repo.update_health(integration_id, status, datetime.utcnow())

    return {
        "integration_id": integration_id,
        "status": status,
        "latency_ms": latency,
        "message": message,
        "tested_at": datetime.utcnow().isoformat(),
    }


@router.delete("/{integration_id}")
async def delete_integration(integration_id: str) -> Dict[str, str]:
    # Soft-delete not yet implemented; for now, simply indicate unsupported.
    raise HTTPException(status_code=501, detail="Integration deletion not yet supported with persistent storage")
