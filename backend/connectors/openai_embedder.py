"""
OpenAI Embedder connector.
Generates dense vector embeddings for a query string using the OpenAI Embeddings API.
Falls back gracefully with a zero-vector when no API key is configured.
"""
from __future__ import annotations

import time
from typing import List

from config import get_settings


class EmbedderResult:
    def __init__(self, vector: List[float], model: str, latency_ms: float, simulated: bool = False):
        self.vector = vector
        self.model = model
        self.latency_ms = latency_ms
        self.simulated = simulated

    def to_dict(self) -> dict:
        return {
            "model": self.model,
            "dimensions": len(self.vector),
            "latency_ms": round(self.latency_ms, 1),
            "simulated": self.simulated,
        }


async def embed_query(text: str) -> EmbedderResult:
    """
    Embed a query string using OpenAI text-embedding-3-small (or configured model).
    Falls back to a simulated zero-vector if OPENAI_API_KEY is not set.
    """
    settings = get_settings()
    start = time.perf_counter()

    if not settings.has_openai():
        # Graceful fallback — return a 1536-dim zero vector clearly marked as simulated
        latency = (time.perf_counter() - start) * 1000
        return EmbedderResult(
            vector=[0.0] * 1536,
            model="simulated",
            latency_ms=latency,
            simulated=True,
        )

    try:
        from openai import AsyncOpenAI  # type: ignore
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.embeddings.create(
            model=settings.openai_embedding_model,
            input=text,
            encoding_format="float",
        )
        latency = (time.perf_counter() - start) * 1000
        return EmbedderResult(
            vector=response.data[0].embedding,
            model=settings.openai_embedding_model,
            latency_ms=latency,
            simulated=False,
        )
    except Exception as exc:
        latency = (time.perf_counter() - start) * 1000
        return EmbedderResult(
            vector=[0.0] * 1536,
            model=f"error:{type(exc).__name__}",
            latency_ms=latency,
            simulated=True,
        )
