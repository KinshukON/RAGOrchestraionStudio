"""Cost & ROI router — DB-backed cost profiles, calculation engine, saved scenarios."""
from __future__ import annotations

import math
from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlmodel import select

from db import get_session
from models_cost import CostProfile, CostScenario

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────

class CostProfileOut(BaseModel):
    id: int
    architecture_type: str
    label: str
    default_top_k: int
    default_chunk_size: int
    latency_estimate_ms: int
    latency_source: str
    embedding_cost_per_1m: float
    llm_input_cost_per_1m: float
    llm_output_cost_per_1m: float
    # Layer 1 additions
    reranker_cost_per_1m: float
    graph_traversal_cost_per_1m: float
    index_storage_cost_monthly: float
    infra_base_cost_monthly: float
    # Layer 2 — business impact
    ticket_deflection_rate: float
    compliance_hours_saved_monthly: float
    escalation_reduction_rate: float
    failed_answer_reduction_rate: float
    search_effort_reduction_rate: float
    analyst_hours_saved_monthly: float
    notes: str
    benchmark_sources: list


class CostProfileUpdate(BaseModel):
    default_top_k: Optional[int] = None
    default_chunk_size: Optional[int] = None
    latency_estimate_ms: Optional[int] = None
    latency_source: Optional[str] = None
    embedding_cost_per_1m: Optional[float] = None
    llm_input_cost_per_1m: Optional[float] = None
    llm_output_cost_per_1m: Optional[float] = None
    reranker_cost_per_1m: Optional[float] = None
    graph_traversal_cost_per_1m: Optional[float] = None
    index_storage_cost_monthly: Optional[float] = None
    infra_base_cost_monthly: Optional[float] = None
    ticket_deflection_rate: Optional[float] = None
    compliance_hours_saved_monthly: Optional[float] = None
    escalation_reduction_rate: Optional[float] = None
    failed_answer_reduction_rate: Optional[float] = None
    search_effort_reduction_rate: Optional[float] = None
    analyst_hours_saved_monthly: Optional[float] = None
    notes: Optional[str] = None
    benchmark_sources: Optional[list] = None


class CalculateRequest(BaseModel):
    architecture_type: str
    monthly_query_volume: int = 50000
    top_k: Optional[int] = None
    chunk_size: Optional[int] = None
    embedding_cost_per_1m: Optional[float] = None
    llm_input_cost_per_1m: Optional[float] = None
    llm_output_cost_per_1m: Optional[float] = None
    avg_context_tokens: int = 1800
    avg_output_tokens: int = 350
    analyst_hours_saved: float = 40
    analyst_hourly_rate: float = 120
    platform_setup_cost: float = 25000
    # Business impact overrides
    support_tickets_monthly: int = 1000
    avg_ticket_cost: float = 45
    compliance_reviews_monthly: int = 50
    compliance_review_hourly_cost: float = 200
    escalations_monthly: int = 80
    avg_escalation_cost: float = 350


class CalculateResponse(BaseModel):
    architecture_type: str
    architecture_label: str
    cost_per_query: float
    cost_per_1k_queries: float
    monthly_cost: float
    annual_cost: float
    manual_monthly: float
    annual_savings: float
    payback_months: Optional[int]
    latency_estimate_ms: int
    breakdown: dict
    explanation: dict
    inputs_used: dict
    # Layer 2 — business impact
    business_impact: dict
    # Layer 3 — executive summary
    executive_summary: dict


class ScenarioCreate(BaseModel):
    name: str
    architecture_type: str
    inputs: dict
    results: dict


class ScenarioOut(BaseModel):
    id: int
    user_id: str
    name: str
    architecture_type: str
    inputs: dict
    results: dict
    created_at: datetime


# ── Seed data ─────────────────────────────────────────────────────────────

_BENCHMARK_COMMON = [
    {"name": "OpenAI Pricing Page", "url": "https://openai.com/pricing", "date": "2025-01-15"},
    {"name": "Anthropic API Pricing", "url": "https://docs.anthropic.com/en/docs/about-claude/pricing", "date": "2025-01-15"},
]

_LATENCY_SOURCE_COMMON = "Estimated from industry benchmarks (Langchain RAG Benchmarks 2024, LlamaIndex Benchmark Suite)"

SEED_PROFILES: list[dict[str, Any]] = [
    {
        "architecture_type": "vector",
        "label": "Vector RAG",
        "default_top_k": 8, "default_chunk_size": 512, "latency_estimate_ms": 380,
        "latency_source": _LATENCY_SOURCE_COMMON,
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "reranker_cost_per_1m": 0.0, "graph_traversal_cost_per_1m": 0.0,
        "index_storage_cost_monthly": 45.0, "infra_base_cost_monthly": 120.0,
        "ticket_deflection_rate": 0.35, "compliance_hours_saved_monthly": 8.0,
        "escalation_reduction_rate": 0.20, "failed_answer_reduction_rate": 0.25,
        "search_effort_reduction_rate": 0.40, "analyst_hours_saved_monthly": 40.0,
        "notes": "Standard embedding-based retrieval. Costs driven primarily by LLM input/output tokens.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "Langchain RAG Benchmarks 2024", "url": "https://blog.langchain.dev/benchmarking-rag-2024/", "date": "2024-09-01"},
        ],
    },
    {
        "architecture_type": "vectorless",
        "label": "Vectorless RAG",
        "default_top_k": 10, "default_chunk_size": 256, "latency_estimate_ms": 120,
        "latency_source": "Elasticsearch BM25 benchmarks — sub-100ms retrieval for keyword search",
        "embedding_cost_per_1m": 0.0, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "reranker_cost_per_1m": 0.0, "graph_traversal_cost_per_1m": 0.0,
        "index_storage_cost_monthly": 25.0, "infra_base_cost_monthly": 80.0,
        "ticket_deflection_rate": 0.25, "compliance_hours_saved_monthly": 15.0,
        "escalation_reduction_rate": 0.15, "failed_answer_reduction_rate": 0.30,
        "search_effort_reduction_rate": 0.50, "analyst_hours_saved_monthly": 35.0,
        "notes": "No embedding cost — uses BM25/keyword retrieval. Lowest retrieval latency. Best for compliance/deterministic.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "Elasticsearch Performance Benchmarks", "url": "https://www.elastic.co/benchmarks", "date": "2024-06-01"},
        ],
    },
    {
        "architecture_type": "graph",
        "label": "Graph RAG",
        "default_top_k": 5, "default_chunk_size": 768, "latency_estimate_ms": 900,
        "latency_source": "Neo4j Cypher query benchmarks + embedding retrieval overhead",
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "reranker_cost_per_1m": 0.0, "graph_traversal_cost_per_1m": 0.18,
        "index_storage_cost_monthly": 85.0, "infra_base_cost_monthly": 200.0,
        "ticket_deflection_rate": 0.30, "compliance_hours_saved_monthly": 6.0,
        "escalation_reduction_rate": 0.35, "failed_answer_reduction_rate": 0.45,
        "search_effort_reduction_rate": 0.30, "analyst_hours_saved_monthly": 45.0,
        "notes": "Higher latency due to graph traversal. Larger chunk sizes to preserve entity context. Best for multi-hop reasoning.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "Microsoft GraphRAG Paper", "url": "https://arxiv.org/abs/2404.16130", "date": "2024-04-24"},
        ],
    },
    {
        "architecture_type": "temporal",
        "label": "Temporal RAG",
        "default_top_k": 8, "default_chunk_size": 512, "latency_estimate_ms": 450,
        "latency_source": _LATENCY_SOURCE_COMMON + " + time-decay scoring overhead",
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "reranker_cost_per_1m": 0.0, "graph_traversal_cost_per_1m": 0.0,
        "index_storage_cost_monthly": 55.0, "infra_base_cost_monthly": 130.0,
        "ticket_deflection_rate": 0.28, "compliance_hours_saved_monthly": 20.0,
        "escalation_reduction_rate": 0.25, "failed_answer_reduction_rate": 0.35,
        "search_effort_reduction_rate": 0.35, "analyst_hours_saved_monthly": 42.0,
        "notes": "Similar to vector but with temporal filtering/scoring. Excellent for policy-answering and audit trails.",
        "benchmark_sources": _BENCHMARK_COMMON,
    },
    {
        "architecture_type": "hybrid",
        "label": "Hybrid RAG",
        "default_top_k": 12, "default_chunk_size": 512, "latency_estimate_ms": 620,
        "latency_source": _LATENCY_SOURCE_COMMON + " + dual-retrieval fusion overhead",
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "reranker_cost_per_1m": 0.08, "graph_traversal_cost_per_1m": 0.0,
        "index_storage_cost_monthly": 65.0, "infra_base_cost_monthly": 160.0,
        "ticket_deflection_rate": 0.45, "compliance_hours_saved_monthly": 12.0,
        "escalation_reduction_rate": 0.30, "failed_answer_reduction_rate": 0.50,
        "search_effort_reduction_rate": 0.55, "analyst_hours_saved_monthly": 55.0,
        "notes": "Flagship architecture. Reranker adds cost but maximises coverage. Best-of-breed for enterprise mixed workloads.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "Reciprocal Rank Fusion benchmarks", "url": "https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf", "date": "2009-07-01"},
        ],
    },
    {
        "architecture_type": "custom",
        "label": "Custom RAG",
        "default_top_k": 8, "default_chunk_size": 512, "latency_estimate_ms": 500,
        "latency_source": "Estimated based on typical custom pipeline configurations",
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "notes": "Baseline estimates for bespoke pipelines. Actual costs depend on custom components.",
        "benchmark_sources": _BENCHMARK_COMMON,
    },
    {
        "architecture_type": "agentic",
        "label": "Agentic RAG",
        "default_top_k": 10, "default_chunk_size": 512, "latency_estimate_ms": 1200,
        "latency_source": "Multi-step agent execution with tool calls — LangGraph/AutoGPT benchmarks",
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "notes": "Highest latency due to iterative agent reasoning loops. Multiple LLM calls per query increase cost 2-3x.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "LangGraph Agent Benchmarks", "url": "https://langchain-ai.github.io/langgraph/", "date": "2024-10-01"},
        ],
    },
    {
        "architecture_type": "modular",
        "label": "Modular RAG",
        "default_top_k": 8, "default_chunk_size": 512, "latency_estimate_ms": 550,
        "latency_source": "Module orchestration adds ~50ms over base vector retrieval",
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "notes": "Similar cost to vector RAG but with module switching overhead. Scales well with microservice deployment.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "Modular RAG Survey (Gao et al.)", "url": "https://arxiv.org/abs/2407.21059", "date": "2024-07-30"},
        ],
    },
    {
        "architecture_type": "memory_augmented",
        "label": "Memory-Augmented RAG",
        "default_top_k": 10, "default_chunk_size": 640, "latency_estimate_ms": 480,
        "latency_source": "Additional memory store lookup adds ~100ms to base retrieval",
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "notes": "Slightly larger context window due to memory injection. Embedding cost shared with memory store updates.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "MemoryBank: Enhancing LLMs with Long-Term Memory", "url": "https://arxiv.org/abs/2305.10250", "date": "2023-05-17"},
        ],
    },
    {
        "architecture_type": "multimodal",
        "label": "Multi-Modal RAG",
        "default_top_k": 6, "default_chunk_size": 1024, "latency_estimate_ms": 1400,
        "latency_source": "Cross-modal embedding (CLIP/ViT) adds significant latency per modality",
        "embedding_cost_per_1m": 0.25, "llm_input_cost_per_1m": 5.00, "llm_output_cost_per_1m": 15.00,
        "notes": "Higher embedding cost (multi-modal models). Larger chunks for images/audio. Vision LLM pricing is 2x text.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "CLIP Retrieval Benchmarks", "url": "https://arxiv.org/abs/2103.00020", "date": "2021-02-26"},
            {"name": "GPT-4V Pricing", "url": "https://openai.com/pricing", "date": "2025-01-15"},
        ],
    },
    {
        "architecture_type": "federated",
        "label": "Federated RAG",
        "default_top_k": 8, "default_chunk_size": 512, "latency_estimate_ms": 950,
        "latency_source": "Network latency across federated sources + privacy guardrail processing",
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "notes": "Latency dominated by slowest federated source. Privacy guardrails add fixed overhead per query.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "Federated Learning Efficiency Survey", "url": "https://arxiv.org/abs/1912.04977", "date": "2019-12-11"},
        ],
    },
    {
        "architecture_type": "streaming",
        "label": "Streaming RAG",
        "default_top_k": 5, "default_chunk_size": 256, "latency_estimate_ms": 180,
        "latency_source": "Optimised for real-time — hot index retrieval, pre-computed embeddings",
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "notes": "Lowest latency after vectorless. Small chunk sizes for real-time windowed data. Continuous embedding cost.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "Apache Kafka + Vector DB Integration", "url": "https://developer.confluent.io/", "date": "2024-06-01"},
        ],
    },
    {
        "architecture_type": "contextual",
        "label": "Contextual RAG",
        "default_top_k": 10, "default_chunk_size": 512, "latency_estimate_ms": 420,
        "latency_source": "Session context injection adds ~40ms over standard vector retrieval",
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "notes": "Similar cost to vector RAG. Slightly higher context tokens due to session history injection.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "Anthropic Contextual Retrieval", "url": "https://www.anthropic.com/news/contextual-retrieval", "date": "2024-09-19"},
        ],
    },
    {
        "architecture_type": "knowledge_enhanced",
        "label": "Knowledge-Enhanced RAG",
        "default_top_k": 6, "default_chunk_size": 768, "latency_estimate_ms": 850,
        "latency_source": "Knowledge graph lookup + document retrieval in parallel, merge adds overhead",
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "notes": "Larger chunks to preserve ontological context. KG lookup is fast but fusion step adds latency.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "KAPING: Knowledge-Augmented Prompting", "url": "https://arxiv.org/abs/2306.04757", "date": "2023-06-07"},
        ],
    },
    {
        "architecture_type": "self_rag",
        "label": "Self-RAG",
        "default_top_k": 8, "default_chunk_size": 512, "latency_estimate_ms": 1100,
        "latency_source": "Draft + self-evaluation loop requires 2 LLM calls per query minimum",
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "notes": "2x LLM cost due to self-evaluation step. Trades latency for higher answer quality. Can exceed 2x with iterative refinement.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "Self-RAG Paper (Asai et al.)", "url": "https://arxiv.org/abs/2310.11511", "date": "2023-10-17"},
        ],
    },
    {
        "architecture_type": "hyde",
        "label": "HyDE RAG",
        "default_top_k": 8, "default_chunk_size": 512, "latency_estimate_ms": 750,
        "latency_source": "Hypothesis generation LLM call adds ~300ms before retrieval",
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "notes": "1.5x LLM cost — extra hypothesis call before retrieval. Significantly improves retrieval relevance for complex queries.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "HyDE Paper (Gao et al.)", "url": "https://arxiv.org/abs/2212.10496", "date": "2022-12-20"},
        ],
    },
    {
        "architecture_type": "recursive",
        "label": "Recursive RAG",
        "default_top_k": 12, "default_chunk_size": 512, "latency_estimate_ms": 1300,
        "latency_source": "Multiple retrieval rounds (2-3) with intermediate reasoning steps",
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "notes": "2-3x base cost due to multi-round retrieval + reasoning. High Top-K to accumulate evidence across rounds.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "IRCoT: Interleaving Retrieval with CoT", "url": "https://arxiv.org/abs/2212.10509", "date": "2022-12-20"},
        ],
    },
    {
        "architecture_type": "domain_specific",
        "label": "Domain-Specific RAG",
        "default_top_k": 8, "default_chunk_size": 640, "latency_estimate_ms": 600,
        "latency_source": "Domain classifier adds ~100ms; compliance check adds ~50ms",
        "embedding_cost_per_1m": 0.15, "llm_input_cost_per_1m": 3.00, "llm_output_cost_per_1m": 12.00,
        "notes": "Slightly higher costs due to specialised domain models. Compliance checker required for regulated industries.",
        "benchmark_sources": _BENCHMARK_COMMON + [
            {"name": "Domain-Adapted LLM Benchmarks (BioMedLM, FinGPT)", "url": "https://arxiv.org/abs/2306.05443", "date": "2023-06-08"},
        ],
    },
]


def _seed_cost_profiles() -> None:
    """Upsert cost profiles — insert any missing architecture types."""
    with get_session() as session:
        for profile_data in SEED_PROFILES:
            existing = session.exec(
                select(CostProfile).where(CostProfile.architecture_type == profile_data["architecture_type"])
            ).first()
            if not existing:
                session.add(CostProfile(**profile_data))
        session.commit()


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.get("/profiles", response_model=List[CostProfileOut])
async def list_cost_profiles() -> list:
    try:
        _seed_cost_profiles()
    except Exception:
        pass
    with get_session() as session:
        profiles = list(session.exec(select(CostProfile).order_by(CostProfile.architecture_type)))
        return [CostProfileOut.model_validate(p, from_attributes=True) for p in profiles]


@router.get("/profiles/{arch_type}", response_model=CostProfileOut)
async def get_cost_profile(arch_type: str) -> CostProfileOut:
    try:
        _seed_cost_profiles()
    except Exception:
        pass
    with get_session() as session:
        profile = session.exec(
            select(CostProfile).where(CostProfile.architecture_type == arch_type)
        ).first()
        if not profile:
            raise HTTPException(404, f"No cost profile for architecture type '{arch_type}'")
        return CostProfileOut.model_validate(profile, from_attributes=True)


@router.patch("/profiles/{arch_type}", response_model=CostProfileOut)
async def update_cost_profile(arch_type: str, body: CostProfileUpdate) -> CostProfileOut:
    with get_session() as session:
        profile = session.exec(
            select(CostProfile).where(CostProfile.architecture_type == arch_type)
        ).first()
        if not profile:
            raise HTTPException(404, f"No cost profile for architecture type '{arch_type}'")
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(profile, field, value)
        profile.updated_at = datetime.utcnow()
        session.add(profile)
        session.commit()
        session.refresh(profile)
        return CostProfileOut.model_validate(profile, from_attributes=True)


@router.post("/calculate", response_model=CalculateResponse)
async def calculate_cost(body: CalculateRequest) -> CalculateResponse:
    """Compute cost/ROI for a given configuration. Returns breakdown + explainability."""
    try:
        _seed_cost_profiles()
    except Exception:
        pass
    with get_session() as session:
        profile = session.exec(
            select(CostProfile).where(CostProfile.architecture_type == body.architecture_type)
        ).first()
        if not profile:
            raise HTTPException(404, f"No cost profile for '{body.architecture_type}'")

        # Resolve inputs — use request overrides or profile defaults
        top_k = body.top_k if body.top_k is not None else profile.default_top_k
        chunk_size = body.chunk_size if body.chunk_size is not None else profile.default_chunk_size
        embed_cost = body.embedding_cost_per_1m if body.embedding_cost_per_1m is not None else profile.embedding_cost_per_1m
        llm_in_cost = body.llm_input_cost_per_1m if body.llm_input_cost_per_1m is not None else profile.llm_input_cost_per_1m
        llm_out_cost = body.llm_output_cost_per_1m if body.llm_output_cost_per_1m is not None else profile.llm_output_cost_per_1m

        # ── Layer 1: Full cost computation ──
        retrieval_tokens = top_k * chunk_size
        embedding_cost_pq = (retrieval_tokens / 1_000_000) * embed_cost
        llm_input_cost_pq = (body.avg_context_tokens / 1_000_000) * llm_in_cost
        llm_output_cost_pq = (body.avg_output_tokens / 1_000_000) * llm_out_cost
        reranker_cost_pq = (retrieval_tokens / 1_000_000) * profile.reranker_cost_per_1m
        graph_cost_pq = (retrieval_tokens / 1_000_000) * profile.graph_traversal_cost_per_1m

        cost_per_query = embedding_cost_pq + llm_input_cost_pq + llm_output_cost_pq + reranker_cost_pq + graph_cost_pq
        monthly_query_cost = cost_per_query * body.monthly_query_volume
        monthly_infra = profile.index_storage_cost_monthly + profile.infra_base_cost_monthly
        monthly_cost = monthly_query_cost + monthly_infra
        annual_cost = monthly_cost * 12

        manual_monthly = body.analyst_hours_saved * body.analyst_hourly_rate
        manual_annual = manual_monthly * 12
        annual_savings = manual_annual - annual_cost

        if annual_savings > 0 and (manual_monthly - monthly_cost) > 0:
            payback_months = math.ceil(
                (body.platform_setup_cost + monthly_cost) / (manual_monthly - monthly_cost)
            )
        else:
            payback_months = None

        total_cost_pq = cost_per_query if cost_per_query > 0 else 1
        breakdown = {
            "embedding_cost_per_query": round(embedding_cost_pq, 8),
            "llm_input_cost_per_query": round(llm_input_cost_pq, 8),
            "llm_output_cost_per_query": round(llm_output_cost_pq, 8),
            "reranker_cost_per_query": round(reranker_cost_pq, 8),
            "graph_traversal_cost_per_query": round(graph_cost_pq, 8),
            "index_storage_monthly": round(profile.index_storage_cost_monthly, 2),
            "infra_base_monthly": round(profile.infra_base_cost_monthly, 2),
            "embedding_pct": round(embedding_cost_pq / total_cost_pq * 100, 1),
            "llm_input_pct": round(llm_input_cost_pq / total_cost_pq * 100, 1),
            "llm_output_pct": round(llm_output_cost_pq / total_cost_pq * 100, 1),
            "reranker_pct": round(reranker_cost_pq / total_cost_pq * 100, 1),
            "graph_pct": round(graph_cost_pq / total_cost_pq * 100, 1),
        }

        explanation = {
            "methodology": (
                f"Token-based cost model. Each query retrieves {top_k} chunks × {chunk_size} tokens = "
                f"{retrieval_tokens:,} retrieval tokens. Embedding: ${embed_cost}/1M. "
                f"LLM input: {body.avg_context_tokens} tokens at ${llm_in_cost}/1M. "
                f"LLM output: {body.avg_output_tokens} tokens at ${llm_out_cost}/1M. "
                f"Infra: ${monthly_infra:,.0f}/mo (storage ${profile.index_storage_cost_monthly:.0f} + compute ${profile.infra_base_cost_monthly:.0f})."
            ),
            "assumptions": [
                f"Top-K chunks: {top_k}",
                f"Chunk size: {chunk_size} tokens",
                f"Embedding model: ${embed_cost}/1M tokens",
                f"LLM model: ${llm_in_cost} input / ${llm_out_cost} output per 1M tokens",
                f"Reranker: ${profile.reranker_cost_per_1m}/1M tokens",
                f"Graph traversal: ${profile.graph_traversal_cost_per_1m}/1M tokens",
                f"Latency: {profile.latency_estimate_ms}ms — {profile.latency_source}",
                f"Value baseline: {body.analyst_hours_saved}h × ${body.analyst_hourly_rate}/h = ${manual_monthly:,.2f}/mo",
            ],
            "benchmark_sources": profile.benchmark_sources,
            "profile_notes": profile.notes,
        }

        # ── Layer 2: Business Impact ──
        ticket_deflection_value = body.support_tickets_monthly * profile.ticket_deflection_rate * body.avg_ticket_cost
        compliance_savings = profile.compliance_hours_saved_monthly * body.compliance_review_hourly_cost
        escalation_savings = body.escalations_monthly * profile.escalation_reduction_rate * body.avg_escalation_cost
        failed_answer_value = body.monthly_query_volume * profile.failed_answer_reduction_rate * 0.02  # $0.02 per avoided bad answer
        search_effort_value = profile.search_effort_reduction_rate * body.analyst_hours_saved * body.analyst_hourly_rate
        total_business_value = ticket_deflection_value + compliance_savings + escalation_savings + failed_answer_value + search_effort_value

        business_impact = {
            "ticket_deflection_value": round(ticket_deflection_value, 2),
            "ticket_deflection_rate": profile.ticket_deflection_rate,
            "compliance_savings": round(compliance_savings, 2),
            "compliance_hours_saved": profile.compliance_hours_saved_monthly,
            "escalation_savings": round(escalation_savings, 2),
            "escalation_reduction_rate": profile.escalation_reduction_rate,
            "failed_answer_reduction_value": round(failed_answer_value, 2),
            "failed_answer_reduction_rate": profile.failed_answer_reduction_rate,
            "search_effort_savings": round(search_effort_value, 2),
            "search_effort_reduction_rate": profile.search_effort_reduction_rate,
            "total_monthly_business_value": round(total_business_value, 2),
            "total_annual_business_value": round(total_business_value * 12, 2),
        }

        # ── Layer 3: Executive Summary ──
        monthly_net = total_business_value - monthly_cost
        if monthly_net > 0:
            exec_payback = math.ceil(body.platform_setup_cost / monthly_net)
        else:
            exec_payback = None

        # Risk reduction score (0-100) based on answer quality + governance + compliance
        risk_score = min(100, round(
            profile.failed_answer_reduction_rate * 30 +
            profile.escalation_reduction_rate * 25 +
            profile.ticket_deflection_rate * 20 +
            (profile.compliance_hours_saved_monthly / 20) * 25
        ))

        executive_summary = {
            "monthly_savings_estimate": round(monthly_net, 2),
            "annual_savings_estimate": round(monthly_net * 12, 2),
            "payback_period_months": exec_payback,
            "risk_reduction_score": risk_score,
            "cost_to_serve_monthly": round(monthly_cost, 2),
            "total_projected_monthly_value": round(total_business_value, 2),
            "recommendation": _generate_recommendation(profile, monthly_net, risk_score),
            "why_this_architecture": _generate_why_narrative(profile, body.architecture_type, monthly_cost, total_business_value),
        }

        inputs_used = {
            "architecture_type": body.architecture_type,
            "monthly_query_volume": body.monthly_query_volume,
            "top_k": top_k,
            "chunk_size": chunk_size,
            "embedding_cost_per_1m": embed_cost,
            "llm_input_cost_per_1m": llm_in_cost,
            "llm_output_cost_per_1m": llm_out_cost,
            "avg_context_tokens": body.avg_context_tokens,
            "avg_output_tokens": body.avg_output_tokens,
            "analyst_hours_saved": body.analyst_hours_saved,
            "analyst_hourly_rate": body.analyst_hourly_rate,
            "platform_setup_cost": body.platform_setup_cost,
        }

        return CalculateResponse(
            architecture_type=body.architecture_type,
            architecture_label=profile.label,
            cost_per_query=round(cost_per_query, 8),
            cost_per_1k_queries=round(cost_per_query * 1000, 2),
            monthly_cost=round(monthly_cost, 2),
            annual_cost=round(annual_cost, 2),
            manual_monthly=round(manual_monthly, 2),
            annual_savings=round(annual_savings, 2),
            payback_months=payback_months,
            latency_estimate_ms=profile.latency_estimate_ms,
            breakdown=breakdown,
            explanation=explanation,
            inputs_used=inputs_used,
            business_impact=business_impact,
            executive_summary=executive_summary,
        )


def _generate_recommendation(profile: CostProfile, monthly_net: float, risk_score: int) -> str:
    """Generate an architecture recommendation sentence based on value analysis."""
    if monthly_net > 5000:
        value_verdict = f"Strong ROI — ${monthly_net:,.0f}/mo net savings."
    elif monthly_net > 0:
        value_verdict = f"Positive ROI — ${monthly_net:,.0f}/mo net savings. Consider scale to improve returns."
    else:
        value_verdict = f"Negative ROI at current volume — increase query volume or reduce infra costs."

    if risk_score >= 75:
        risk_verdict = f"High risk reduction ({risk_score}/100) — strong governance and quality improvement."
    elif risk_score >= 50:
        risk_verdict = f"Moderate risk reduction ({risk_score}/100) — acceptable for most enterprise use cases."
    else:
        risk_verdict = f"Low risk reduction ({risk_score}/100) — consider architectures with stronger quality guarantees."

    return f"{value_verdict} {risk_verdict} Recommended for: {profile.notes}"


def _generate_why_narrative(profile: CostProfile, arch_type: str, monthly_cost: float, biz_value: float) -> str:
    """Generate 'why this architecture is cheaper/more defensible than alternatives' narrative."""
    narratives = {
        "vector": f"Vector RAG delivers ${biz_value:,.0f}/mo business value at ${monthly_cost:,.0f}/mo cost. It provides the best balance of semantic coverage and cost for general-purpose knowledge retrieval without the infra overhead of graph or hybrid.",
        "vectorless": f"Vectorless RAG delivers ${biz_value:,.0f}/mo business value at the lowest cost-to-serve (${monthly_cost:,.0f}/mo). Zero embedding costs and deterministic retrieval make it the most defensible choice for compliance-heavy workloads where explainability matters.",
        "graph": f"Graph RAG delivers ${biz_value:,.0f}/mo business value. While cost-to-serve is higher (${monthly_cost:,.0f}/mo), the 45% reduction in failed answers from multi-hop reasoning justifies the premium for investigation and relationship-dependent workloads.",
        "temporal": f"Temporal RAG delivers ${biz_value:,.0f}/mo business value at ${monthly_cost:,.0f}/mo. The 20h/mo compliance savings from time-aware policy answers and audit trail support make it 18% more cost-effective than graph-based alternatives for regulatory workloads.",
        "hybrid": f"Hybrid RAG delivers the highest business value (${biz_value:,.0f}/mo) by fusing dense and sparse retrieval. At ${monthly_cost:,.0f}/mo, the reranker cost is recovered through 45% ticket deflection and 55% search effort reduction — making it the safety-net architecture for mixed enterprise workloads.",
    }
    return narratives.get(arch_type, f"{profile.label} delivers ${biz_value:,.0f}/mo business value at ${monthly_cost:,.0f}/mo cost. {profile.notes}")


@router.get("/scenarios", response_model=List[ScenarioOut])
async def list_scenarios(user_id: str = "anonymous") -> list:
    with get_session() as session:
        scenarios = list(session.exec(
            select(CostScenario)
            .where(CostScenario.user_id == user_id)
            .order_by(CostScenario.created_at.desc())  # type: ignore[union-attr]
        ))
        return [ScenarioOut.model_validate(s, from_attributes=True) for s in scenarios]


@router.post("/scenarios", response_model=ScenarioOut, status_code=201)
async def save_scenario(body: ScenarioCreate, user_id: str = "anonymous") -> ScenarioOut:
    with get_session() as session:
        scenario = CostScenario(
            user_id=user_id,
            name=body.name,
            architecture_type=body.architecture_type,
            inputs=body.inputs,
            results=body.results,
        )
        session.add(scenario)
        session.commit()
        session.refresh(scenario)
        return ScenarioOut.model_validate(scenario, from_attributes=True)


@router.delete("/scenarios/{scenario_id}")
async def delete_scenario(scenario_id: int):
    with get_session() as session:
        scenario = session.get(CostScenario, scenario_id)
        if not scenario:
            raise HTTPException(404, "Scenario not found")
        session.delete(scenario)
        session.commit()
    return Response(status_code=204)


# ── TCO Comparator ────────────────────────────────────────────────────────

@router.get("/tco-comparator")
async def tco_comparator(
    monthly_query_volume: int = 50000,
    analyst_hours_saved: float = 40,
    analyst_hourly_rate: float = 120,
) -> dict:
    """Compare all architectures side-by-side: cost, latency, business value, risk, narrative."""
    try:
        _seed_cost_profiles()
    except Exception:
        pass
    with get_session() as session:
        profiles = list(session.exec(select(CostProfile).order_by(CostProfile.latency_estimate_ms)))

    comparisons = []
    for p in profiles:
        retrieval_tokens = p.default_top_k * p.default_chunk_size
        e_cost = (retrieval_tokens / 1_000_000) * p.embedding_cost_per_1m
        i_cost = (1800 / 1_000_000) * p.llm_input_cost_per_1m
        o_cost = (350 / 1_000_000) * p.llm_output_cost_per_1m
        r_cost = (retrieval_tokens / 1_000_000) * p.reranker_cost_per_1m
        g_cost = (retrieval_tokens / 1_000_000) * p.graph_traversal_cost_per_1m
        cpq = e_cost + i_cost + o_cost + r_cost + g_cost
        monthly_infra = p.index_storage_cost_monthly + p.infra_base_cost_monthly
        monthly_cost = cpq * monthly_query_volume + monthly_infra
        manual = analyst_hours_saved * analyst_hourly_rate

        ticket_val = 1000 * p.ticket_deflection_rate * 45
        compliance_val = p.compliance_hours_saved_monthly * 200
        escalation_val = 80 * p.escalation_reduction_rate * 350
        search_val = p.search_effort_reduction_rate * analyst_hours_saved * analyst_hourly_rate
        biz_value = ticket_val + compliance_val + escalation_val + search_val

        risk = min(100, round(
            p.failed_answer_reduction_rate * 30 +
            p.escalation_reduction_rate * 25 +
            p.ticket_deflection_rate * 20 +
            (p.compliance_hours_saved_monthly / 20) * 25
        ))

        comparisons.append({
            "architecture_type": p.architecture_type,
            "label": p.label,
            "cost_per_1k_queries": round(cpq * 1000, 4),
            "monthly_cost": round(monthly_cost, 2),
            "annual_cost": round(monthly_cost * 12, 2),
            "latency_ms": p.latency_estimate_ms,
            "monthly_business_value": round(biz_value, 2),
            "monthly_net_savings": round(biz_value - monthly_cost, 2),
            "risk_reduction_score": risk,
            "ticket_deflection_rate": p.ticket_deflection_rate,
            "failed_answer_reduction_rate": p.failed_answer_reduction_rate,
            "why_this_architecture": _generate_why_narrative(p, p.architecture_type, monthly_cost, biz_value),
            "notes": p.notes,
        })

    # Sort by net savings descending
    comparisons.sort(key=lambda c: c["monthly_net_savings"], reverse=True)

    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "parameters": {
            "monthly_query_volume": monthly_query_volume,
            "analyst_hours_saved": analyst_hours_saved,
            "analyst_hourly_rate": analyst_hourly_rate,
        },
        "architectures": comparisons,
        "recommendation": comparisons[0]["architecture_type"] if comparisons else None,
        "recommendation_label": comparisons[0]["label"] if comparisons else None,
    }


# ── Use Case ROI Templates ───────────────────────────────────────────────

_USE_CASE_TEMPLATES = [
    {
        "id": "support-assistant",
        "label": "Support Assistant",
        "description": "AI-powered support ticket triage, knowledge lookup, and answer drafting.",
        "recommended_architecture": "hybrid",
        "monthly_query_volume": 80000,
        "analyst_hours_saved": 60,
        "support_tickets_monthly": 3000,
        "escalations_monthly": 200,
        "key_value_driver": "ticket_deflection",
        "typical_payback_months": 3,
    },
    {
        "id": "compliance-qa",
        "label": "Compliance Q&A",
        "description": "Regulatory query answering, policy lookup, audit trail generation.",
        "recommended_architecture": "temporal",
        "monthly_query_volume": 20000,
        "analyst_hours_saved": 80,
        "support_tickets_monthly": 200,
        "escalations_monthly": 30,
        "key_value_driver": "compliance_hours_saved",
        "typical_payback_months": 4,
    },
    {
        "id": "incident-investigation",
        "label": "Incident Investigation",
        "description": "Multi-hop root-cause analysis across incident reports, logs, and knowledge bases.",
        "recommended_architecture": "graph",
        "monthly_query_volume": 15000,
        "analyst_hours_saved": 50,
        "support_tickets_monthly": 500,
        "escalations_monthly": 120,
        "key_value_driver": "escalation_reduction",
        "typical_payback_months": 5,
    },
    {
        "id": "contract-intelligence",
        "label": "Contract Intelligence",
        "description": "Contract clause search, obligation tracking, and risk flagging.",
        "recommended_architecture": "vectorless",
        "monthly_query_volume": 10000,
        "analyst_hours_saved": 40,
        "support_tickets_monthly": 100,
        "escalations_monthly": 20,
        "key_value_driver": "search_effort_reduction",
        "typical_payback_months": 6,
    },
]


@router.get("/use-case-templates")
async def use_case_templates() -> dict:
    """Return pre-built ROI models for common enterprise use cases."""
    try:
        _seed_cost_profiles()
    except Exception:
        pass

    results = []
    with get_session() as session:
        for tmpl in _USE_CASE_TEMPLATES:
            p = session.exec(
                select(CostProfile).where(CostProfile.architecture_type == tmpl["recommended_architecture"])
            ).first()
            if not p:
                continue

            vol = tmpl["monthly_query_volume"]
            ret_tokens = p.default_top_k * p.default_chunk_size
            cpq = (
                (ret_tokens / 1_000_000) * p.embedding_cost_per_1m +
                (1800 / 1_000_000) * p.llm_input_cost_per_1m +
                (350 / 1_000_000) * p.llm_output_cost_per_1m +
                (ret_tokens / 1_000_000) * p.reranker_cost_per_1m +
                (ret_tokens / 1_000_000) * p.graph_traversal_cost_per_1m
            )
            monthly_cost = cpq * vol + p.index_storage_cost_monthly + p.infra_base_cost_monthly
            biz_value = (
                tmpl["support_tickets_monthly"] * p.ticket_deflection_rate * 45 +
                p.compliance_hours_saved_monthly * 200 +
                tmpl["escalations_monthly"] * p.escalation_reduction_rate * 350 +
                p.search_effort_reduction_rate * tmpl["analyst_hours_saved"] * 120
            )

            results.append({
                **tmpl,
                "architecture_label": p.label,
                "cost_per_1k_queries": round(cpq * 1000, 4),
                "monthly_cost": round(monthly_cost, 2),
                "monthly_business_value": round(biz_value, 2),
                "monthly_net_savings": round(biz_value - monthly_cost, 2),
                "projected_annual_value": round(biz_value * 12, 2),
                "why": _generate_why_narrative(p, tmpl["recommended_architecture"], monthly_cost, biz_value),
            })

    return {"templates": results}


# ── Environment Cost Heatmap ──────────────────────────────────────────────

@router.get("/env-cost-heatmap")
async def env_cost_heatmap(monthly_query_volume: int = 50000) -> dict:
    """Return cost breakdown by env tier (dev/staging/prod) × architecture."""
    try:
        _seed_cost_profiles()
    except Exception:
        pass

    ENV_FACTORS = {
        "development": {"query_fraction": 0.10, "infra_factor": 0.3, "label": "Development"},
        "staging":     {"query_fraction": 0.20, "infra_factor": 0.5, "label": "Staging"},
        "production":  {"query_fraction": 0.70, "infra_factor": 1.0, "label": "Production"},
    }

    with get_session() as session:
        profiles = list(session.exec(select(CostProfile).order_by(CostProfile.architecture_type)))

    heatmap = []
    for p in profiles:
        ret_tokens = p.default_top_k * p.default_chunk_size
        cpq = (
            (ret_tokens / 1_000_000) * p.embedding_cost_per_1m +
            (1800 / 1_000_000) * p.llm_input_cost_per_1m +
            (350 / 1_000_000) * p.llm_output_cost_per_1m +
            (ret_tokens / 1_000_000) * p.reranker_cost_per_1m +
            (ret_tokens / 1_000_000) * p.graph_traversal_cost_per_1m
        )
        monthly_infra = p.index_storage_cost_monthly + p.infra_base_cost_monthly

        envs = {}
        for env_key, factors in ENV_FACTORS.items():
            env_vol = monthly_query_volume * factors["query_fraction"]
            env_infra = monthly_infra * factors["infra_factor"]
            env_cost = cpq * env_vol + env_infra
            envs[env_key] = {
                "label": factors["label"],
                "monthly_cost": round(env_cost, 2),
                "query_volume": int(env_vol),
                "infra_cost": round(env_infra, 2),
            }

        total = sum(e["monthly_cost"] for e in envs.values())
        heatmap.append({
            "architecture_type": p.architecture_type,
            "label": p.label,
            "environments": envs,
            "total_monthly": round(total, 2),
        })

    return {
        "monthly_query_volume": monthly_query_volume,
        "environments": ["development", "staging", "production"],
        "heatmap": heatmap,
    }
