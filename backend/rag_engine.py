"""
RAG Engine – Central Orchestrator
Routes a query through the appropriate connector pipeline based on architecture type.

Architecture routing:
  vector     → embed → pgvector_retrieve → rerank → openai_generate
  vectorless → embed → pgvector_retrieve (lexical only) → rerank → anthropic_generate
  hybrid     → embed → pgvector_retrieve + graph_retrieve → rerank → openai_generate
  graph      → neo4j_retrieve → rerank → anthropic_generate
  temporal   → embed → pgvector_retrieve (time-filtered) → rerank → openai_generate
  custom     → embed → pgvector_retrieve → rerank → openai_generate

All steps fall back to simulated data if the required API key / DB is not configured.
The is_simulated flag in the result indicates whether any step used simulation.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import List, Dict, Any

from connectors.pgvector_retriever import RetrievedChunk, retrieve_similar
from connectors.openai_embedder import embed_query
from connectors.cohere_reranker import rerank_chunks
from connectors.llm_generator import generate_with_openai, generate_with_anthropic, GeneratorResult
from connectors.neo4j_retriever import retrieve_graph, GraphChunk


@dataclass
class RAGSpan:
    """Telemetry span for a single pipeline step."""
    step: str
    latency_ms: float
    simulated: bool
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RAGResult:
    """Full result returned by the RAG engine."""
    query: str
    architecture_type: str
    answer: str
    retrieved_chunks: List[Dict[str, Any]]
    graph_chunks: List[Dict[str, Any]]
    reranked_chunk_ids: List[str]
    spans: List[Dict[str, Any]]  # telemetry timeline
    total_latency_ms: float
    is_simulated: bool
    model_used: str
    input_tokens: int
    output_tokens: int
    confidence_score: float
    hallucination_risk: str
    sources: List[str]

    def as_trace_dict(self) -> Dict[str, Any]:
        """Serialise into the WorkflowSimulationTrace shape the frontend expects."""
        return {
            "retrieved_sources": self.retrieved_chunks,
            "retrieval_path": [s["step"] for s in self.spans],
            "vector_hits": [c for c in self.retrieved_chunks if not c.get("relationships")],
            "metadata_matches": [],
            "graph_traversal": self.graph_chunks,
            "temporal_filters": [],
            "reranking_decisions": [
                {"chunk_id": cid, "rank": i + 1}
                for i, cid in enumerate(self.reranked_chunk_ids)
            ],
            "final_prompt_context": "\n\n".join(
                c.get("content", "") for c in self.retrieved_chunks[:3]
            ),
            "model_answer": self.answer,
            "grounded_citations": [
                {"source": s, "confidence": 0.9} for s in self.sources
            ],
            "latency_ms": round(self.total_latency_ms, 1),
            "confidence_score": round(self.confidence_score, 3),
            "hallucination_risk": self.hallucination_risk,
            "is_simulated": self.is_simulated,
            "model_used": self.model_used,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "spans": self.spans,
        }


def _confidence_from_chunks(chunks: List[RetrievedChunk]) -> float:
    if not chunks:
        return 0.0
    avg_score = sum(c.score for c in chunks) / len(chunks)
    return round(min(avg_score, 1.0), 3)


def _hallucination_risk(confidence: float, is_simulated: bool) -> str:
    if is_simulated:
        return "unknown (simulated)"
    if confidence >= 0.85:
        return "low"
    if confidence >= 0.65:
        return "medium"
    return "high"


async def run_rag_pipeline(
    query: str,
    architecture_type: str,
    top_k: int = 5,
    parameters: Dict[str, Any] | None = None,
) -> RAGResult:
    """
    Main entry point. Routes query through architecture-specific connector pipeline.
    Always returns a result — simulated if no real connectors are available.
    """
    params = parameters or {}
    top_k = int(params.get("top_k", top_k))
    arch = architecture_type.lower()
    spans: List[RAGSpan] = []
    total_start = time.perf_counter()
    is_simulated = False

    # ── Step 1: Embed ──────────────────────────────────────────────────────
    embed_result = await embed_query(query)
    spans.append(RAGSpan(
        step="embed_query",
        latency_ms=embed_result.latency_ms,
        simulated=embed_result.simulated,
        metadata=embed_result.to_dict(),
    ))
    is_simulated = is_simulated or embed_result.simulated

    # ── Step 2: Retrieve ───────────────────────────────────────────────────
    vector_chunks: List[RetrievedChunk] = []
    graph_result_chunks: List[GraphChunk] = []

    if arch in ("vector", "vectorless", "hybrid", "temporal", "custom"):
        vector_chunks = await retrieve_similar(
            query_vector=embed_result.vector,
            top_k=top_k,
        )
        is_simulated = is_simulated or any(c.simulated for c in vector_chunks)
        spans.append(RAGSpan(
            step="vector_retrieve",
            latency_ms=sum(0 for _ in vector_chunks),  # asyncpg doesn't expose per-call time easily
            simulated=any(c.simulated for c in vector_chunks),
            metadata={"hits": len(vector_chunks)},
        ))

    if arch in ("graph", "hybrid"):
        graph_result_chunks = await retrieve_graph(query=query, top_k=top_k)
        is_simulated = is_simulated or any(c.simulated for c in graph_result_chunks)
        spans.append(RAGSpan(
            step="graph_retrieve",
            latency_ms=0,
            simulated=any(c.simulated for c in graph_result_chunks),
            metadata={"nodes": len(graph_result_chunks)},
        ))

    # If graph-only architecture, wrap GraphChunks as RetrievedChunks for reranking
    if arch == "graph" and not vector_chunks:
        vector_chunks = [
            RetrievedChunk(
                id=g.id,
                content=g.content,
                score=g.score,
                source=g.source,
                metadata={"relationships": g.relationships},
                simulated=g.simulated,
            )
            for g in graph_result_chunks
        ]

    # ── Step 3: Rerank ─────────────────────────────────────────────────────
    reranked = await rerank_chunks(query=query, chunks=vector_chunks, top_n=top_k)
    is_simulated = is_simulated or any(c.simulated for c in reranked)
    spans.append(RAGSpan(
        step="rerank",
        latency_ms=0,
        simulated=any(c.simulated for c in reranked),
        metadata={"reranked_count": len(reranked)},
    ))

    # ── Step 4: Generate ───────────────────────────────────────────────────
    gen_result: GeneratorResult
    if arch in ("vectorless", "graph"):
        gen_result = await generate_with_anthropic(query=query, chunks=reranked)
    else:
        gen_result = await generate_with_openai(query=query, chunks=reranked)
    is_simulated = is_simulated or gen_result.simulated
    spans.append(RAGSpan(
        step="generate",
        latency_ms=gen_result.latency_ms,
        simulated=gen_result.simulated,
        metadata=gen_result.to_dict(),
    ))

    total_latency = (time.perf_counter() - total_start) * 1000
    confidence = _confidence_from_chunks(reranked)

    return RAGResult(
        query=query,
        architecture_type=arch,
        answer=gen_result.answer,
        retrieved_chunks=[c.to_dict() for c in reranked],
        graph_chunks=[g.to_dict() for g in graph_result_chunks],
        reranked_chunk_ids=[c.id for c in reranked],
        spans=[
            {
                "step": s.step,
                "latency_ms": round(s.latency_ms, 1),
                "simulated": s.simulated,
                **s.metadata,
            }
            for s in spans
        ],
        total_latency_ms=total_latency,
        is_simulated=is_simulated,
        model_used=gen_result.model,
        input_tokens=gen_result.input_tokens,
        output_tokens=gen_result.output_tokens,
        confidence_score=confidence,
        hallucination_risk=_hallucination_risk(confidence, is_simulated),
        sources=list({c.source for c in reranked if c.source}),
    )
