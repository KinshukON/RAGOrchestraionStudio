"""
pgvector Retriever connector.
Performs cosine similarity search against a pgvector collection.
Falls back to simulated fixture documents when PGVECTOR_URL is not configured.
"""
from __future__ import annotations

import time
from typing import List, Dict, Any


class RetrievedChunk:
    def __init__(
        self,
        id: str,
        content: str,
        score: float,
        source: str,
        metadata: Dict[str, Any] | None = None,
        simulated: bool = False,
    ):
        self.id = id
        self.content = content
        self.score = score
        self.source = source
        self.metadata = metadata or {}
        self.simulated = simulated

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "content": self.content,
            "score": round(self.score, 4),
            "source": self.source,
            "metadata": self.metadata,
            "simulated": self.simulated,
        }


_FIXTURE_CHUNKS = [
    {
        "id": "doc_001",
        "content": "RAG (Retrieval-Augmented Generation) combines retrieval systems with large language models to produce grounded, factual answers.",
        "source": "rag_overview.pdf",
        "score": 0.92,
    },
    {
        "id": "doc_002",
        "content": "Vector databases store dense embeddings and support approximate nearest-neighbour (ANN) search using algorithms like HNSW and IVFFlat.",
        "source": "vector_db_guide.pdf",
        "score": 0.87,
    },
    {
        "id": "doc_003",
        "content": "Hybrid RAG combines dense vector retrieval with sparse BM25 retrieval, then fuses results using Reciprocal Rank Fusion (RRF).",
        "source": "hybrid_retrieval.pdf",
        "score": 0.84,
    },
    {
        "id": "doc_004",
        "content": "Graph RAG traverses a knowledge graph to resolve entity relationships and multi-hop reasoning across connected documents.",
        "source": "graph_rag.pdf",
        "score": 0.79,
    },
    {
        "id": "doc_005",
        "content": "Temporal RAG filters documents by recency or time windows, ensuring the most up-to-date information is used for time-sensitive queries.",
        "source": "temporal_rag.pdf",
        "score": 0.76,
    },
]


async def retrieve_similar(
    query_vector: List[float],
    top_k: int = 5,
    collection: str | None = None,
) -> List[RetrievedChunk]:
    """
    Retrieve top-k most similar chunks from pgvector.
    Falls back to fixture data when PGVECTOR_URL is not configured.
    """
    from config import get_settings
    settings = get_settings()
    start = time.perf_counter()

    if not settings.has_pgvector() or all(v == 0.0 for v in query_vector[:10]):
        # Simulated path
        results = []
        for chunk in _FIXTURE_CHUNKS[:top_k]:
            results.append(
                RetrievedChunk(
                    id=chunk["id"],
                    content=chunk["content"],
                    score=chunk["score"],
                    source=chunk["source"],
                    simulated=True,
                )
            )
        return results

    try:
        import asyncpg  # type: ignore
        col = collection or settings.pgvector_collection
        vector_str = "[" + ",".join(str(v) for v in query_vector) + "]"
        conn = await asyncpg.connect(settings.pgvector_url)
        try:
            rows = await conn.fetch(
                f"""
                SELECT id, content, source, metadata,
                       1 - (embedding <=> $1::vector) AS score
                FROM {col}
                ORDER BY embedding <=> $1::vector
                LIMIT $2
                """,
                vector_str,
                top_k,
            )
            results = []
            for row in rows:
                results.append(
                    RetrievedChunk(
                        id=str(row["id"]),
                        content=row["content"],
                        score=float(row["score"]),
                        source=row.get("source", ""),
                        metadata=dict(row.get("metadata") or {}),
                        simulated=False,
                    )
                )
            return results
        finally:
            await conn.close()
    except Exception as exc:
        # Fall back to fixtures on any connection error
        results = []
        for chunk in _FIXTURE_CHUNKS[:top_k]:
            results.append(
                RetrievedChunk(
                    id=chunk["id"],
                    content=chunk["content"],
                    score=chunk["score"],
                    source=chunk["source"],
                    metadata={"error": str(exc)},
                    simulated=True,
                )
            )
        return results
