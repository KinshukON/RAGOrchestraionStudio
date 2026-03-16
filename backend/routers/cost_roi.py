"""Cost & ROI router — DB-backed cost profiles, calculation engine, saved scenarios."""
from __future__ import annotations

import math
from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException
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
    notes: Optional[str] = None
    benchmark_sources: Optional[list] = None


class CalculateRequest(BaseModel):
    architecture_type: str
    monthly_query_volume: int = 50000
    top_k: Optional[int] = None            # if None, use profile default
    chunk_size: Optional[int] = None
    embedding_cost_per_1m: Optional[float] = None
    llm_input_cost_per_1m: Optional[float] = None
    llm_output_cost_per_1m: Optional[float] = None
    avg_context_tokens: int = 1800
    avg_output_tokens: int = 350
    analyst_hours_saved: float = 40
    analyst_hourly_rate: float = 120
    platform_setup_cost: float = 25000


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
        "notes": "No embedding cost — uses BM25/keyword retrieval. Lowest retrieval latency.",
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
        "notes": "Higher latency due to graph traversal. Larger chunk sizes to preserve entity context.",
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
        "notes": "Similar to vector but with temporal filtering/scoring. Slight latency increase for recency weighting.",
        "benchmark_sources": _BENCHMARK_COMMON,
    },
    {
        "architecture_type": "hybrid",
        "label": "Hybrid RAG",
        "default_top_k": 12, "default_chunk_size": 512, "latency_estimate_ms": 620,
        "latency_source": _LATENCY_SOURCE_COMMON + " + dual-retrieval fusion overhead",
        "embedding_cost_per_1m": 0.13, "llm_input_cost_per_1m": 2.50, "llm_output_cost_per_1m": 10.00,
        "notes": "Higher Top-K to accommodate both vector and lexical retrievers. Reranker adds latency but improves quality.",
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

        # ── Cost computation ──
        retrieval_tokens = top_k * chunk_size
        embedding_cost_pq = (retrieval_tokens / 1_000_000) * embed_cost
        llm_input_cost_pq = (body.avg_context_tokens / 1_000_000) * llm_in_cost
        llm_output_cost_pq = (body.avg_output_tokens / 1_000_000) * llm_out_cost
        cost_per_query = embedding_cost_pq + llm_input_cost_pq + llm_output_cost_pq

        monthly_cost = cost_per_query * body.monthly_query_volume
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
            "embedding_pct": round(embedding_cost_pq / total_cost_pq * 100, 1),
            "llm_input_pct": round(llm_input_cost_pq / total_cost_pq * 100, 1),
            "llm_output_pct": round(llm_output_cost_pq / total_cost_pq * 100, 1),
        }

        explanation = {
            "methodology": (
                f"Token-based cost model. Each query retrieves {top_k} chunks × {chunk_size} tokens = "
                f"{retrieval_tokens:,} retrieval tokens. Embedding cost: {embed_cost} per 1M tokens. "
                f"LLM input: {body.avg_context_tokens} context tokens at ${llm_in_cost}/1M. "
                f"LLM output: {body.avg_output_tokens} tokens at ${llm_out_cost}/1M."
            ),
            "assumptions": [
                f"Top-K chunks: {top_k} (from {'user override' if body.top_k else 'profile default'})",
                f"Chunk size: {chunk_size} tokens (from {'user override' if body.chunk_size else 'profile default'})",
                f"Embedding model: ${embed_cost}/1M tokens (e.g. text-embedding-3-small)",
                f"LLM model: ${llm_in_cost} input / ${llm_out_cost} output per 1M tokens (e.g. GPT-4o)",
                f"Latency estimate: {profile.latency_estimate_ms}ms — {profile.latency_source}",
                f"Value baseline: {body.analyst_hours_saved}h × ${body.analyst_hourly_rate}/h = ${manual_monthly:,.2f}/month manual cost",
            ],
            "benchmark_sources": profile.benchmark_sources,
            "profile_notes": profile.notes,
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
        )


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


@router.delete("/scenarios/{scenario_id}", status_code=204)
async def delete_scenario(scenario_id: int) -> None:
    with get_session() as session:
        scenario = session.get(CostScenario, scenario_id)
        if not scenario:
            raise HTTPException(404, "Scenario not found")
        session.delete(scenario)
        session.commit()
