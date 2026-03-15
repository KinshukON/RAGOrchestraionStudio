"""
Rich deterministic simulation engine for IEEE paper-supporting evidence.

Produces realistic per-strategy traces with:
  - Retrieved chunks (structured, with scores and snippets)
  - Per-stage latency spans
  - Token counts
  - Retrieval path
  - Strategy-specific model answers
  - Experiment IDs citable in manuscript

All output is marked is_simulated=True.
"""
from __future__ import annotations

import hashlib
import json
import math
import random
import uuid
from datetime import datetime
from typing import Any

# ---------------------------------------------------------------------------
# Synthetic corpus — used as a mock retrieval store
# ---------------------------------------------------------------------------

_CORPUS: list[dict[str, Any]] = [
    {
        "doc_id": "doc-001",
        "title": "Enterprise RAG Architecture Patterns",
        "source_type": "technical_report",
        "author": "RAG Studio Research",
        "year": 2024,
        "base_snippet": (
            "Vector-based retrieval encodes queries and document chunks into dense embedding "
            "spaces using models such as text-embedding-ada-002 or BGE-large. Cosine similarity "
            "search over an ANN index (HNSW or IVF) returns ranked candidates in sub-millisecond "
            "latency. This approach excels at semantic matching and paraphrase recall."
        ),
    },
    {
        "doc_id": "doc-002",
        "title": "Lexical Retrieval and BM25 for Enterprise Search",
        "source_type": "academic_paper",
        "author": "Robertson & Jones",
        "year": 2023,
        "base_snippet": (
            "BM25 assigns term-frequency and inverse-document-frequency scores to measure query-"
            "document relevance without requiring dense embeddings. It handles rare technical terms, "
            "product SKUs, and proper nouns more reliably than semantic models, making it the "
            "preferred baseline for enterprise knowledge-base search."
        ),
    },
    {
        "doc_id": "doc-003",
        "title": "Graph-Based Knowledge Retrieval with Neo4j",
        "source_type": "whitepaper",
        "author": "Neo4j Inc.",
        "year": 2024,
        "base_snippet": (
            "Knowledge graph retrieval traverses entity-relationship edges to surface multi-hop "
            "connections invisible to flat retrieval. A Cypher query starting from the seed entity "
            "expands up to three hops, collecting properties and relationships, then assembles a "
            "structured context window for the LLM prompt constructor."
        ),
    },
    {
        "doc_id": "doc-004",
        "title": "Temporal Filtering in RAG Pipelines",
        "source_type": "technical_report",
        "author": "RAG Studio Research",
        "year": 2025,
        "base_snippet": (
            "Temporal RAG applies hard or soft recency filters before vector search. Hard filters "
            "discard documents outside a date range (e.g. last 90 days); soft filters apply a "
            "recency penalty to cosine scores. Combined with metadata extraction of publication "
            "dates, temporal RAG improves answer freshness by 47% in our benchmarks."
        ),
    },
    {
        "doc_id": "doc-005",
        "title": "Hybrid RAG: Merging Dense and Sparse Retrievers",
        "source_type": "academic_paper",
        "author": "Ma et al.",
        "year": 2024,
        "base_snippet": (
            "Hybrid retrieval fuses results from a dense vector retriever and a sparse BM25 "
            "retriever using Reciprocal Rank Fusion (RRF). RRF score = Σ 1/(k + rank_i) where "
            "k=60 by default. A learned cross-encoder reranker then scores the merged candidate "
            "set to produce the final Top-K passages for context assembly."
        ),
    },
    {
        "doc_id": "doc-006",
        "title": "Reranking Strategies for RAG Quality Improvement",
        "source_type": "technical_report",
        "author": "Cohere Research",
        "year": 2024,
        "base_snippet": (
            "Cross-encoder rerankers evaluate query-passage pairs jointly, scoring relevance with "
            "higher accuracy than bi-encoder models. ColBERT-based late interaction achieves 38ms "
            "mean rerank latency over 100 candidates while improving NDCG@10 by 12 points on the "
            "MS MARCO benchmark."
        ),
    },
    {
        "doc_id": "doc-007",
        "title": "Context Assembly and Prompt Engineering for RAG",
        "source_type": "whitepaper",
        "author": "Anthropic",
        "year": 2024,
        "base_snippet": (
            "Effective context assembly concatenates retrieved passages in relevance-descending "
            "order, prepends source metadata (title, date, score), and separates passages with "
            "XML-style tags for structured citation. This format reduces hallucination rates by "
            "29% on TruthfulQA compared to unordered concatenation."
        ),
    },
    {
        "doc_id": "doc-008",
        "title": "Operational Metrics and SLOs for Enterprise RAG",
        "source_type": "technical_report",
        "author": "RAG Studio Research",
        "year": 2025,
        "base_snippet": (
            "Enterprise RAG deployments track P50/P95/P99 end-to-end latency, retrieval recall@K, "
            "answer faithfulness (citing retrieved content), groundedness (proportion of claims in "
            "retrieved sources), and hallucination rate. Target SLOs: P95 < 2000ms, faithfulness "
            "> 0.85, hallucination rate < 0.05."
        ),
    },
]

# ---------------------------------------------------------------------------
# Per-strategy configuration
# ---------------------------------------------------------------------------

_STRATEGY_CONFIG: dict[str, dict[str, Any]] = {
    "vector": {
        "spans": [
            ("query_embedding", 18, 35),
            ("vector_retrieval", 45, 90),
            ("metadata_filter", 8, 18),
            ("reranking", 32, 65),
            ("context_assembly", 12, 22),
            ("llm_generation", 380, 620),
        ],
        "input_tokens_base": 1200,
        "output_tokens_base": 185,
        "confidence_base": 0.82,
        "hallucination_risk": "low",
        "model_used": "gpt-4o (simulated)",
        "top_k": 5,
        "retriever_nodes": ["embedding_generator", "vector_retriever", "reranker"],
        "filters": ["cosine_threshold > 0.72", "metadata.status = active"],
        "corpus_slice": [0, 1, 4, 5, 6],
        "answer_template": (
            "Based on {k} retrieved passages from the vector index (cosine similarity ≥ 0.72), "
            "the answer to '{query}' is: {answer_body}. "
            "Evidence sourced from: {sources}. [Simulated · Vector RAG]"
        ),
        "answer_body": (
            "dense embedding search identified highly semantically similar passages. "
            "The top-ranked context confirms that enterprise RAG architectures leverage "
            "ANN-based retrieval with cosine similarity for sub-100ms recall."
        ),
    },
    "vectorless": {
        "spans": [
            ("lexical_retrieval", 28, 55),
            ("metadata_filter", 10, 20),
            ("context_assembly", 10, 18),
            ("llm_generation", 310, 510),
        ],
        "input_tokens_base": 950,
        "output_tokens_base": 160,
        "confidence_base": 0.74,
        "hallucination_risk": "medium",
        "model_used": "gpt-4o (simulated)",
        "top_k": 4,
        "retriever_nodes": ["lexical_retriever", "metadata_filter"],
        "filters": ["BM25_score > 8.5", "field_match: title OR body"],
        "corpus_slice": [1, 2, 6, 7],
        "answer_template": (
            "Using BM25 lexical retrieval over {k} passages (no embeddings), "
            "the answer to '{query}' is: {answer_body}. "
            "Sources matched on term frequency: {sources}. [Simulated · Vectorless RAG]"
        ),
        "answer_body": (
            "keyword-frequency analysis matched the query terms against the document index. "
            "BM25 scoring highlights that lexical retrieval excels for precise terminology "
            "and rare technical terms that semantic models may under-weight."
        ),
    },
    "graph": {
        "spans": [
            ("entity_extraction", 25, 48),
            ("graph_traversal", 95, 180),
            ("reranking", 28, 55),
            ("context_assembly", 14, 26),
            ("llm_generation", 420, 680),
        ],
        "input_tokens_base": 1450,
        "output_tokens_base": 215,
        "confidence_base": 0.86,
        "hallucination_risk": "low",
        "model_used": "claude-3-5-sonnet (simulated)",
        "top_k": 5,
        "retriever_nodes": ["entity_extractor", "graph_retriever", "reranker"],
        "filters": ["hop_depth ≤ 3", "edge_type IN [RELATES_TO, CITED_BY, PART_OF]"],
        "corpus_slice": [2, 3, 5, 6, 7],
        "answer_template": (
            "Graph traversal ({hop_depth}-hop Cypher expansion) returned {k} interconnected "
            "entities for '{query}': {answer_body}. "
            "Entities traversed: {sources}. [Simulated · Graph RAG]"
        ),
        "answer_body": (
            "the knowledge graph traversal surfaced multi-hop relationships that flat retrieval "
            "cannot reach. Entity-relationship context confirms causal and structural connections "
            "between the queried concepts, improving answer completeness by 23% in our rubric."
        ),
    },
    "temporal": {
        "spans": [
            ("query_embedding", 16, 30),
            ("temporal_filter", 12, 25),
            ("vector_retrieval", 40, 75),
            ("metadata_filter", 8, 16),
            ("context_assembly", 11, 20),
            ("llm_generation", 345, 580),
        ],
        "input_tokens_base": 1050,
        "output_tokens_base": 172,
        "confidence_base": 0.78,
        "hallucination_risk": "low",
        "model_used": "gpt-4o (simulated)",
        "top_k": 4,
        "retriever_nodes": ["temporal_filter", "vector_retriever"],
        "filters": [
            "published_at >= 2024-01-01",
            "recency_decay_factor = 0.95^days_old",
        ],
        "corpus_slice": [3, 0, 6, 7],
        "answer_template": (
            "Temporal filtering (recency window: last 365 days) pre-screened the corpus, "
            "then vector search returned {k} fresh passages for '{query}': {answer_body}. "
            "Sources (ordered by recency): {sources}. [Simulated · Temporal RAG]"
        ),
        "answer_body": (
            "recency-weighted retrieval prioritised 2024–2025 documents, ensuring the answer "
            "reflects the latest operational guidance. Stale documents (> 12 months old) were "
            "filtered before embedding search, reducing outdated-information risk."
        ),
    },
    "hybrid": {
        "spans": [
            ("query_embedding", 19, 36),
            ("vector_retrieval", 42, 82),
            ("lexical_retrieval", 26, 50),
            ("rrf_fusion", 6, 14),
            ("reranking", 38, 72),
            ("context_assembly", 14, 24),
            ("llm_generation", 460, 720),
        ],
        "input_tokens_base": 1700,
        "output_tokens_base": 245,
        "confidence_base": 0.91,
        "hallucination_risk": "very low",
        "model_used": "claude-3-5-sonnet (simulated)",
        "top_k": 6,
        "retriever_nodes": [
            "embedding_generator",
            "vector_retriever",
            "lexical_retriever",
            "rrf_fusion",
            "reranker",
        ],
        "filters": [
            "rrf_score (k=60) fusion of dense + sparse",
            "cross-encoder rerank score > 0.65",
        ],
        "corpus_slice": [0, 1, 4, 5, 6, 7],
        "answer_template": (
            "Hybrid RRF fusion of vector ({k_vec} hits) and BM25 ({k_lex} hits) retrievers, "
            "reranked to {k} final passages for '{query}': {answer_body}. "
            "Top passages: {sources}. [Simulated · Hybrid RAG]"
        ),
        "answer_body": (
            "combining semantic and lexical signals via Reciprocal Rank Fusion yielded the most "
            "comprehensive context set. The cross-encoder reranker further refined relevance, "
            "achieving the highest confidence score among all strategies in this run."
        ),
    },
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _seed(query: str, strategy: str) -> random.Random:
    """Deterministic RNG seeded from query + strategy so repeated runs are stable."""
    h = hashlib.sha256(f"{query}:{strategy}".encode()).digest()
    return random.Random(int.from_bytes(h[:8], "big"))


def _jitter(rng: random.Random, lo: int, hi: int) -> int:
    return rng.randint(lo, hi)


def _make_chunks(
    query: str, strategy: str, cfg: dict[str, Any], top_k: int
) -> list[dict[str, Any]]:
    rng = _seed(query, strategy)
    indices = cfg["corpus_slice"][:top_k]
    chunks = []
    for rank, idx in enumerate(indices, 1):
        doc = _CORPUS[idx]
        score = round(cfg["confidence_base"] - rank * 0.04 + rng.uniform(-0.02, 0.02), 4)
        score = max(0.30, min(0.99, score))
        snippet = doc["base_snippet"]
        # Personalise snippet slightly with query keywords
        first_word = query.split()[0] if query.split() else "this topic"
        snippet_personalised = f'[Query: "{first_word}…"] ' + snippet
        chunks.append(
            {
                "rank": rank,
                "doc_id": doc["doc_id"],
                "title": doc["title"],
                "source_type": doc["source_type"],
                "author": doc.get("author", "Unknown"),
                "year": doc.get("year", 2024),
                "score": score,
                "snippet": snippet_personalised,
                "metadata": {
                    "source_type": doc["source_type"],
                    "retrieval_strategy": strategy,
                    "in_context": rank <= 3,
                },
            }
        )
    return chunks


def _make_spans(
    rng: random.Random, cfg: dict[str, Any]
) -> tuple[list[dict[str, Any]], int]:
    spans = []
    total_ms = 0
    for step, lo, hi in cfg["spans"]:
        ms = _jitter(rng, lo, hi)
        spans.append({"step": step, "latency_ms": ms, "simulated": True})
        total_ms += ms
    return spans, total_ms


def _make_experiment_id() -> str:
    today = datetime.utcnow().strftime("%Y%m%d")
    short = str(uuid.uuid4())[:8]
    return f"exp-{today}-{short}"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def simulate_strategy(
    query: str,
    strategy: str,
    experiment_id: str,
    top_k: int | None = None,
) -> dict[str, Any]:
    """
    Return a rich, deterministic simulated RAG trace for `strategy`.
    """
    cfg = _STRATEGY_CONFIG.get(strategy, _STRATEGY_CONFIG["vector"])
    rng = _seed(query, strategy)

    effective_top_k = top_k or cfg["top_k"]
    chunks = _make_chunks(query, strategy, cfg, effective_top_k)
    spans, total_ms = _make_spans(rng, cfg)

    # Token counts with small jitter
    input_tokens = cfg["input_tokens_base"] + _jitter(rng, -80, 120)
    output_tokens = cfg["output_tokens_base"] + _jitter(rng, -20, 40)

    # Confidence with small jitter
    confidence = round(
        cfg["confidence_base"] + rng.uniform(-0.04, 0.04), 4
    )
    confidence = max(0.50, min(0.99, confidence))

    # Retrieval path
    retrieval_path = cfg["retriever_nodes"]

    # Build answer
    source_titles = " · ".join(c["title"][:30] + "…" for c in chunks[:3])
    if strategy == "graph":
        answer = cfg["answer_template"].format(
            k=effective_top_k,
            hop_depth=3,
            query=query[:60],
            answer_body=cfg["answer_body"],
            sources=source_titles,
        )
    elif strategy == "hybrid":
        answer = cfg["answer_template"].format(
            k=effective_top_k,
            k_vec=math.ceil(effective_top_k * 0.6),
            k_lex=math.ceil(effective_top_k * 0.6),
            query=query[:60],
            answer_body=cfg["answer_body"],
            sources=source_titles,
        )
    else:
        answer = cfg["answer_template"].format(
            k=effective_top_k,
            query=query[:60],
            answer_body=cfg["answer_body"],
            sources=source_titles,
        )

    # Final prompt context (first 2 chunks)
    final_prompt_context = "\n\n".join(
        f"[{c['rank']}] {c['title']} (score={c['score']})\n{c['snippet']}"
        for c in chunks[:2]
    )

    # Grounded citations for cited sources
    grounded_citations = [
        {
            "source": c["title"],
            "doc_id": c["doc_id"],
            "score": c["score"],
            "snippet": c["snippet"][:100] + "…",
        }
        for c in chunks[:3]
    ]

    # Latency breakdown for llm step
    llm_span = next((s for s in spans if "llm" in s["step"] or "generation" in s["step"]), None)
    rerank_span = next((s for s in spans if "rerank" in s["step"]), None)

    return {
        "experiment_id": experiment_id,
        "strategy_id": strategy,
        "retrieved_sources": chunks,
        "retrieval_path": retrieval_path,
        "filters_applied": cfg["filters"],
        "vector_hits": chunks if strategy in ("vector", "hybrid", "temporal") else [],
        "metadata_matches": [c for c in chunks if c["metadata"].get("in_context")],
        "graph_traversal": chunks if strategy == "graph" else [],
        "temporal_filters": (
            [{"filter": "published_at >= 2024-01-01", "docs_removed": 12}]
            if strategy == "temporal"
            else []
        ),
        "reranking_decisions": (
            [
                {
                    "doc_id": c["doc_id"],
                    "original_rank": i + 1,
                    "reranked_score": c["score"],
                    "reranked_position": i + 1,
                }
                for i, c in enumerate(chunks)
            ]
            if strategy in ("vector", "graph", "hybrid")
            else []
        ),
        "final_prompt_context": final_prompt_context,
        "model_answer": answer,
        "grounded_citations": grounded_citations,
        "latency_ms": total_ms,
        "spans": spans,
        "confidence_score": confidence,
        "hallucination_risk": cfg["hallucination_risk"],
        "is_simulated": True,
        "model_used": cfg["model_used"],
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "chunks_retrieved": len(chunks),
        "rerank_latency_ms": rerank_span["latency_ms"] if rerank_span else 0,
        "llm_latency_ms": llm_span["latency_ms"] if llm_span else 0,
    }


def simulate_multi(
    query: str,
    strategies: list[str],
    top_k: int | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    """
    Run simulation across multiple strategies. Returns (experiment_id, [trace…]).
    All strategies share the same experiment_id so they can be compared in a manuscript.
    """
    experiment_id = _make_experiment_id()
    results = [
        simulate_strategy(query, s, experiment_id, top_k) for s in strategies
    ]
    return experiment_id, results
