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
    # Security & sharing
    owner_user_id: Optional[int] = None
    sharing_scope: str = "organization"  # private | team | organization
    shared_with_team_ids: List[int] = []
    credential_encrypted: bool = False

    @staticmethod
    def _mask_credential(value: str) -> str:
        """Mask credentials to show only last 4 chars. Never expose raw secrets."""
        if not value or len(value) <= 4:
            return "****"
        return "****" + value[-4:]

    @classmethod
    def from_model(cls, model: IntegrationModel) -> "IntegrationConfig":
        return cls(
            id=model.external_id,
            name=model.name,
            provider_type=model.provider_type,
            credentials_reference=cls._mask_credential(model.credentials_reference),
            environment_mapping=model.environment_mapping or {},
            default_usage_policies=model.default_usage_policies or {},
            reusable=model.reusable,
            health_status=model.health_status,
            last_tested_at=model.last_tested_at.isoformat() if model.last_tested_at else None,
            owner_user_id=model.owner_user_id,
            sharing_scope=model.sharing_scope or "organization",
            shared_with_team_ids=model.shared_with_team_ids or [],
            credential_encrypted=model.credential_encrypted,
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


# ── WS-3: Stack Validation ────────────────────────────────────────────────

# Required integrations per architecture type
_ARCH_REQUIRED_INTEGRATIONS: Dict[str, Dict[str, List[str]]] = {
    "vector": {"required": ["embedding_provider", "vector_db", "llm_provider"], "optional": ["reranker"]},
    "vectorless": {"required": ["sql_db", "llm_provider"], "optional": ["file_storage"]},
    "graph": {"required": ["graph_db", "embedding_provider", "llm_provider"], "optional": ["vector_db"]},
    "temporal": {"required": ["embedding_provider", "vector_db", "llm_provider"], "optional": ["sql_db"]},
    "hybrid": {"required": ["embedding_provider", "vector_db", "llm_provider", "reranker"], "optional": ["graph_db", "sql_db"]},
    "custom": {"required": ["llm_provider"], "optional": ["embedding_provider", "vector_db", "graph_db"]},
    "agentic": {"required": ["llm_provider"], "optional": ["embedding_provider", "vector_db"]},
    "modular": {"required": ["llm_provider"], "optional": ["embedding_provider", "vector_db"]},
    "memory_augmented": {"required": ["llm_provider", "vector_db"], "optional": ["embedding_provider"]},
    "multimodal": {"required": ["llm_provider", "embedding_provider"], "optional": ["vector_db", "file_storage"]},
    "federated": {"required": ["llm_provider"], "optional": ["vector_db"]},
    "streaming": {"required": ["llm_provider"], "optional": ["embedding_provider", "vector_db"]},
    "contextual": {"required": ["llm_provider", "embedding_provider"], "optional": ["vector_db"]},
    "knowledge_enhanced": {"required": ["llm_provider", "graph_db"], "optional": ["embedding_provider", "vector_db"]},
    "self_rag": {"required": ["llm_provider", "embedding_provider", "vector_db"], "optional": ["reranker"]},
    "hyde": {"required": ["llm_provider", "embedding_provider", "vector_db"], "optional": []},
    "recursive": {"required": ["llm_provider", "embedding_provider", "vector_db"], "optional": ["reranker"]},
    "domain_specific": {"required": ["llm_provider"], "optional": ["embedding_provider", "vector_db", "sql_db"]},
}

# Legacy provider_type normalization
_TYPE_MAP = {"llm": "llm_provider", "embedding": "embedding_provider", "storage": "file_storage", "observability": "logging_monitoring"}


@router.get("/stack-validation/{arch_type}")
async def validate_stack(arch_type: str) -> Dict[str, Any]:
    """Check if an architecture can run in dev/staging/prod by verifying integrations."""
    reqs = _ARCH_REQUIRED_INTEGRATIONS.get(arch_type)
    if not reqs:
        raise HTTPException(404, f"Unknown architecture '{arch_type}'")

    integrations = _int_repo.list_integrations()
    # Normalize provider types
    configured_types = {}
    for i in integrations:
        pt = _TYPE_MAP.get(i.provider_type, i.provider_type)
        health = i.health_status or "untested"
        if pt not in configured_types or health == "healthy":
            configured_types[pt] = {"name": i.name, "health": health, "external_id": i.external_id}

    required_results = []
    for rt in reqs["required"]:
        cfg = configured_types.get(rt)
        required_results.append({
            "type": rt,
            "status": "configured" if cfg else "missing",
            "health": cfg["health"] if cfg else None,
            "integration_name": cfg["name"] if cfg else None,
        })
    optional_results = []
    for ot in reqs.get("optional", []):
        cfg = configured_types.get(ot)
        optional_results.append({
            "type": ot,
            "status": "configured" if cfg else "not_configured",
            "health": cfg["health"] if cfg else None,
            "integration_name": cfg["name"] if cfg else None,
        })

    all_required_met = all(r["status"] == "configured" for r in required_results)
    all_healthy = all(r["health"] == "healthy" for r in required_results if r["status"] == "configured")
    missing = [r["type"] for r in required_results if r["status"] == "missing"]
    unhealthy = [r["type"] for r in required_results if r["status"] == "configured" and r["health"] != "healthy"]

    # Environment readiness
    environments = {
        "development": "ready" if all_required_met else "missing_deps",
        "staging": "ready" if all_required_met and all_healthy else ("missing_deps" if not all_required_met else "unhealthy"),
        "production": "ready" if all_required_met and all_healthy and not unhealthy else ("missing_deps" if not all_required_met else "not_ready"),
    }

    readiness_score = round(
        sum(1 for r in required_results if r["status"] == "configured") / max(len(required_results), 1) * 100
    )

    return {
        "architecture_type": arch_type,
        "readiness_score": readiness_score,
        "all_required_met": all_required_met,
        "all_healthy": all_healthy,
        "missing_integrations": missing,
        "unhealthy_integrations": unhealthy,
        "required": required_results,
        "optional": optional_results,
        "environments": environments,
    }


# ── Connector Packs ──────────────────────────────────────────────────────

_CONNECTOR_PACKS = {
    "vector": {
        "label": "Vector RAG Pack",
        "connectors": ["OpenAI Embeddings", "Pinecone/pgvector", "GPT-4o", "Cohere Reranker (optional)"],
        "setup_days": 2, "cost_tier": "low",
        "dependencies": ["embedding_provider → vector_db → llm_provider"],
    },
    "vectorless": {
        "label": "Vectorless RAG Pack",
        "connectors": ["Elasticsearch/OpenSearch", "PostgreSQL Full-Text", "GPT-4o"],
        "setup_days": 1, "cost_tier": "lowest",
        "dependencies": ["sql_db/search_engine → llm_provider"],
    },
    "graph": {
        "label": "Graph RAG Pack",
        "connectors": ["Neo4j", "OpenAI Embeddings", "GPT-4o", "Entity Extractor"],
        "setup_days": 5, "cost_tier": "high",
        "dependencies": ["graph_db + embedding_provider → llm_provider"],
    },
    "temporal": {
        "label": "Temporal RAG Pack",
        "connectors": ["OpenAI Embeddings", "Pinecone/pgvector", "GPT-4o", "Temporal DB Adapter"],
        "setup_days": 3, "cost_tier": "medium",
        "dependencies": ["embedding_provider → vector_db + temporal_index → llm_provider"],
    },
    "hybrid": {
        "label": "Hybrid RAG Pack (Flagship)",
        "connectors": ["OpenAI Embeddings", "Pinecone/pgvector", "Elasticsearch", "Cohere Reranker", "GPT-4o"],
        "setup_days": 4, "cost_tier": "medium-high",
        "dependencies": ["embedding_provider → vector_db + lexical_search → reranker → llm_provider"],
    },
}


@router.get("/connector-packs")
async def list_connector_packs() -> Dict[str, Any]:
    """Return recommended connector bundles per architecture."""
    return {"packs": _CONNECTOR_PACKS}


# ── Usage Analytics ──────────────────────────────────────────────────────

@router.get("/usage-analytics")
async def integration_usage_analytics() -> Dict[str, Any]:
    """Show connector usage counts, health distribution, and type coverage."""
    integrations = _int_repo.list_integrations()
    type_counts: Dict[str, int] = {}
    health_counts: Dict[str, int] = {"healthy": 0, "degraded": 0, "untested": 0, "error": 0}

    for i in integrations:
        pt = _TYPE_MAP.get(i.provider_type, i.provider_type)
        type_counts[pt] = type_counts.get(pt, 0) + 1
        h = i.health_status or "untested"
        if h in health_counts:
            health_counts[h] += 1

    return {
        "total_integrations": len(integrations),
        "by_type": type_counts,
        "health_distribution": health_counts,
        "healthy_pct": round(health_counts["healthy"] / max(len(integrations), 1) * 100),
    }
