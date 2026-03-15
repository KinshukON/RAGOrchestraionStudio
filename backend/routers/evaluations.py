"""
Evaluations API — Benchmark Harness (IEEE paper-grade).
Includes canonical enterprise query seeds, expected answers, rubric fields,
scenario tags, pass/fail rating, heuristic scoring, and full export.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

router = APIRouter()

# ── In-memory stores (DB-ready design) ─────────────────────────────────────
_test_cases: List[Dict[str, Any]] = []
_benchmark_queries: List[Dict[str, Any]] = []

# ── Pre-seeded canonical enterprise benchmark queries ───────────────────────
_CANONICAL_SEEDS: List[Dict[str, Any]] = [
    {
        "id": "bq-seed-001",
        "query": "What are the key differences between vector, graph, and hybrid RAG architectures for enterprise search?",
        "expected_answer": (
            "Vector RAG uses dense embedding search for semantic similarity. "
            "Graph RAG traverses entity-relationship graphs for multi-hop reasoning. "
            "Hybrid RAG fuses both via Reciprocal Rank Fusion for highest coverage."
        ),
        "expected_evidence": [
            "Enterprise RAG Architecture Patterns",
            "Graph-Based Knowledge Retrieval with Neo4j",
            "Hybrid RAG: Merging Dense and Sparse Retrievers",
        ],
        "rubric": (
            "Answer must distinguish retrieval mechanism, context type, and use-case fit. "
            "Must mention embedding/cosine similarity for vector, graph traversal for graph, "
            "and RRF/fusion for hybrid."
        ),
        "scenario_tag": "semantic",
        "difficulty": "medium",
        "created_at": "2025-01-01T00:00:00Z",
        "scores": {},
        "human_rating": None,
        "status": "pending",
    },
    {
        "id": "bq-seed-002",
        "query": "How does temporal filtering improve RAG answer freshness and what are its tradeoffs?",
        "expected_answer": (
            "Temporal filtering applies recency windows (hard cutoff or decay factor) before "
            "retrieval to prioritise recent documents. Tradeoffs: may exclude relevant older "
            "documents; requires reliable publication-date metadata."
        ),
        "expected_evidence": [
            "Temporal Filtering in RAG Pipelines",
            "Operational Metrics and SLOs for Enterprise RAG",
        ],
        "rubric": (
            "Must mention recency window / decay factor. Must acknowledge tradeoff of "
            "excluding older but still-relevant documents. Bonus for quoting the 47% "
            "freshness improvement figure."
        ),
        "scenario_tag": "temporal",
        "difficulty": "medium",
        "created_at": "2025-01-01T00:00:00Z",
        "scores": {},
        "human_rating": None,
        "status": "pending",
    },
    {
        "id": "bq-seed-003",
        "query": "What is Reciprocal Rank Fusion and how is it used in hybrid RAG?",
        "expected_answer": (
            "RRF merges ranked lists from multiple retrievers using score = Σ 1/(k + rank_i) "
            "where k=60 by default. It is retrieval-agnostic and robust to score-scale "
            "differences between dense and sparse retrievers."
        ),
        "expected_evidence": [
            "Hybrid RAG: Merging Dense and Sparse Retrievers",
            "Reranking Strategies for RAG Quality Improvement",
        ],
        "rubric": (
            "Must state the RRF formula. Must explain why it is robust to score-scale mismatch. "
            "Should mention k=60 default."
        ),
        "scenario_tag": "semantic",
        "difficulty": "hard",
        "created_at": "2025-01-01T00:00:00Z",
        "scores": {},
        "human_rating": None,
        "status": "pending",
    },
    {
        "id": "bq-seed-004",
        "query": "What BM25 scoring parameters affect lexical retrieval quality in enterprise knowledge bases?",
        "expected_answer": (
            "BM25 uses term frequency (TF) and inverse document frequency (IDF) with parameters "
            "k1 (term saturation, default 1.2) and b (field-length normalisation, default 0.75). "
            "For enterprise corpora with long documents, lowering b improves precision."
        ),
        "expected_evidence": [
            "Lexical Retrieval and BM25 for Enterprise Search",
        ],
        "rubric": (
            "Must mention TF and IDF components. Should mention k1 and b parameters. "
            "Bonus for noting relevance to enterprise-specific document lengths."
        ),
        "scenario_tag": "structured",
        "difficulty": "hard",
        "created_at": "2025-01-01T00:00:00Z",
        "scores": {},
        "human_rating": None,
        "status": "pending",
    },
    {
        "id": "bq-seed-005",
        "query": "What P95 latency and faithfulness SLOs should a production enterprise RAG system target?",
        "expected_answer": (
            "Target SLOs: P95 end-to-end latency < 2000ms, answer faithfulness > 0.85, "
            "hallucination rate < 0.05. Retrieval stage should complete within 200ms P95."
        ),
        "expected_evidence": [
            "Operational Metrics and SLOs for Enterprise RAG",
        ],
        "rubric": (
            "Answer must quote numeric SLO targets. Must distinguish end-to-end from "
            "retrieval-stage latency. Must mention hallucination rate metric."
        ),
        "scenario_tag": "policy",
        "difficulty": "easy",
        "created_at": "2025-01-01T00:00:00Z",
        "scores": {},
        "human_rating": None,
        "status": "pending",
    },
    {
        "id": "bq-seed-006",
        "query": "How does graph traversal context assembly differ from flat vector retrieval context?",
        "expected_answer": (
            "Graph traversal expands multi-hop entity relationships up to 3 hops, collecting "
            "structured property-relationship contexts. Flat vector retrieval returns independent "
            "passage chunks ranked by cosine similarity without cross-passage linking."
        ),
        "expected_evidence": [
            "Graph-Based Knowledge Retrieval with Neo4j",
            "Context Assembly and Prompt Engineering for RAG",
        ],
        "rubric": (
            "Must contrast structural graph context with flat chunk context. "
            "Must mention hop depth. Should mention Cypher queries or entity expansion."
        ),
        "scenario_tag": "graph",
        "difficulty": "medium",
        "created_at": "2025-01-01T00:00:00Z",
        "scores": {},
        "human_rating": None,
        "status": "pending",
    },
]


def _init_seeds() -> None:
    """Idempotently load canonical seed queries."""
    existing_ids = {q["id"] for q in _benchmark_queries}
    for seed in _CANONICAL_SEEDS:
        if seed["id"] not in existing_ids:
            _benchmark_queries.append(dict(seed))


_init_seeds()


# ── Heuristic scorer ─────────────────────────────────────────────────────────

def _score_heuristic(
    query: str,
    expected_answer: str,
    model_answer: str,
    retrieved_titles: List[str],
    expected_evidence: List[str],
) -> Dict[str, float]:
    """Simple keyword-overlap heuristics — no external LLM needed."""
    # Relevance: keyword overlap between model_answer and expected_answer
    exp_tokens = set(re.findall(r"\w+", expected_answer.lower()))
    got_tokens = set(re.findall(r"\w+", model_answer.lower()))
    relevance = round(
        len(exp_tokens & got_tokens) / max(len(exp_tokens), 1), 3
    )

    # Groundedness: fraction of expected evidence titles retrieved
    ev_lower = [e.lower() for e in expected_evidence]
    ret_lower = [t.lower() for t in retrieved_titles]
    ground_hits = sum(
        1 for ev in ev_lower if any(ev[:20] in r for r in ret_lower)
    )
    groundedness = round(ground_hits / max(len(ev_lower), 1), 3)

    # Completeness: length ratio proxy
    completeness = round(
        min(len(model_answer) / max(len(expected_answer), 1), 1.0), 3
    )

    return {
        "relevance": relevance,
        "groundedness": groundedness,
        "completeness": completeness,
        "composite": round((relevance + groundedness + completeness) / 3, 3),
    }


# ── Pydantic models ──────────────────────────────────────────────────────────

class TestCaseCreate(BaseModel):
    workflow_id: str
    environment_id: str
    query: str
    strategy_id: str
    expected_answer: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None


class TestCaseResponse(BaseModel):
    id: str
    workflow_id: str
    environment_id: str
    query: str
    strategy_id: str
    expected_answer: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    created_at: str


class BenchmarkQueryCreate(BaseModel):
    query: str
    expected_answer: str = ""
    expected_evidence: List[str] = Field(default_factory=list)
    rubric: str = ""
    scenario_tag: str = "semantic"
    difficulty: str = "medium"


class BenchmarkScoreInput(BaseModel):
    strategy_id: str
    model_answer: str
    retrieved_titles: List[str] = Field(default_factory=list)
    latency_ms: float = 0
    confidence_score: float = 0
    human_rating: Optional[int] = None   # 1-5 stars


class BenchmarkQueryResponse(BaseModel):
    id: str
    query: str
    expected_answer: str
    expected_evidence: List[str]
    rubric: str
    scenario_tag: str
    difficulty: str
    created_at: str
    scores: Dict[str, Any]
    human_rating: Optional[int]
    status: str


# ── Test-case endpoints (backwards-compatible) ───────────────────────────────

@router.post("/test-cases", response_model=TestCaseResponse)
def create_test_case(payload: TestCaseCreate) -> TestCaseResponse:
    id_ = str(uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    record = {
        "id": id_,
        "workflow_id": payload.workflow_id,
        "environment_id": payload.environment_id,
        "query": payload.query,
        "strategy_id": payload.strategy_id,
        "expected_answer": payload.expected_answer,
        "parameters": payload.parameters or {},
        "created_at": now,
    }
    _test_cases.append(record)
    return TestCaseResponse(**record)


@router.get("/test-cases", response_model=List[TestCaseResponse])
def list_test_cases(
    workflow_id: Optional[str] = None,
    environment_id: Optional[str] = None,
) -> List[TestCaseResponse]:
    out = list(_test_cases)
    if workflow_id:
        out = [t for t in out if t["workflow_id"] == workflow_id]
    if environment_id:
        out = [t for t in out if t["environment_id"] == environment_id]
    return [TestCaseResponse(**t) for t in out]


# ── Benchmark harness endpoints ───────────────────────────────────────────────

@router.get("/benchmark-queries", response_model=List[BenchmarkQueryResponse])
def list_benchmark_queries(scenario_tag: Optional[str] = None) -> List[BenchmarkQueryResponse]:
    out = list(_benchmark_queries)
    if scenario_tag:
        out = [q for q in out if q.get("scenario_tag") == scenario_tag]
    return [BenchmarkQueryResponse(**q) for q in out]


@router.post("/benchmark-queries", response_model=BenchmarkQueryResponse)
def create_benchmark_query(payload: BenchmarkQueryCreate) -> BenchmarkQueryResponse:
    id_ = f"bq-{str(uuid4())[:8]}"
    now = datetime.utcnow().isoformat() + "Z"
    record: Dict[str, Any] = {
        "id": id_,
        "query": payload.query,
        "expected_answer": payload.expected_answer,
        "expected_evidence": payload.expected_evidence,
        "rubric": payload.rubric,
        "scenario_tag": payload.scenario_tag,
        "difficulty": payload.difficulty,
        "created_at": now,
        "scores": {},
        "human_rating": None,
        "status": "pending",
    }
    _benchmark_queries.append(record)
    return BenchmarkQueryResponse(**record)


@router.patch("/benchmark-queries/{bq_id}/score", response_model=BenchmarkQueryResponse)
def score_benchmark_query(bq_id: str, payload: BenchmarkScoreInput) -> BenchmarkQueryResponse:
    record = next((q for q in _benchmark_queries if q["id"] == bq_id), None)
    if not record:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Benchmark query not found")

    heuristic = _score_heuristic(
        query=record["query"],
        expected_answer=record["expected_answer"],
        model_answer=payload.model_answer,
        retrieved_titles=payload.retrieved_titles,
        expected_evidence=record.get("expected_evidence", []),
    )

    strategy_score = {
        "strategy_id": payload.strategy_id,
        "latency_ms": payload.latency_ms,
        "confidence_score": payload.confidence_score,
        "heuristic": heuristic,
        "human_rating": payload.human_rating,
        "scored_at": datetime.utcnow().isoformat() + "Z",
    }

    if "per_strategy" not in record["scores"]:
        record["scores"]["per_strategy"] = {}
    record["scores"]["per_strategy"][payload.strategy_id] = strategy_score

    if payload.human_rating is not None:
        record["human_rating"] = payload.human_rating

    # Mark as scored if at least one strategy has been evaluated
    record["status"] = "scored"

    return BenchmarkQueryResponse(**record)


@router.get("/export")
def export_all() -> JSONResponse:
    """Export all benchmark queries + scores as structured JSON (citable artefact)."""
    return JSONResponse(
        content={
            "export_generated_at": datetime.utcnow().isoformat() + "Z",
            "benchmark_queries": _benchmark_queries,
            "test_cases": _test_cases,
        }
    )
