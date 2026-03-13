"""
Cohere Reranker connector.
Reranks a list of retrieved chunks against the original query using Cohere's Rerank API.
Falls back to identity ordering (preserves original scores) when COHERE_API_KEY is not set.
"""
from __future__ import annotations

import time
from typing import List

from connectors.pgvector_retriever import RetrievedChunk


async def rerank_chunks(
    query: str,
    chunks: List[RetrievedChunk],
    top_n: int | None = None,
) -> List[RetrievedChunk]:
    """
    Rerank chunks using Cohere rerank-english-v3.0 (or configured model).
    Falls back to original order if COHERE_API_KEY is not configured.
    Returns chunks sorted by relevance score descending.
    """
    from config import get_settings
    settings = get_settings()

    if not chunks:
        return chunks

    if not settings.has_cohere():
        # Identity rerank — just return as-is, marking as simulated
        for c in chunks:
            c.simulated = True
        return chunks[:top_n] if top_n else chunks

    start = time.perf_counter()
    try:
        import cohere  # type: ignore
        co = cohere.AsyncClient(api_key=settings.cohere_api_key)
        documents = [c.content for c in chunks]
        response = await co.rerank(
            model=settings.cohere_rerank_model,
            query=query,
            documents=documents,
            top_n=top_n or len(chunks),
        )
        # Re-order based on Cohere relevance scores
        reranked: List[RetrievedChunk] = []
        for result in response.results:
            original_chunk = chunks[result.index]
            original_chunk.score = result.relevance_score
            original_chunk.simulated = False
            reranked.append(original_chunk)
        return reranked
    except Exception:
        # Fall back to original order on any error
        return chunks[:top_n] if top_n else chunks
