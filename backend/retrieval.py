from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Protocol, runtime_checkable


@dataclass
class RetrievedDocument:
    id: str
    content: str
    score: float
    metadata: Dict[str, Any]


@runtime_checkable
class RetrievalProvider(Protocol):
    async def query(
        self,
        query: str,
        *,
        top_k: int = 10,
        filters: Dict[str, Any] | None = None,
    ) -> List[RetrievedDocument]:
        ...


class VectorRetrievalProvider:
    async def query(
        self,
        query: str,
        *,
        top_k: int = 10,
        filters: Dict[str, Any] | None = None,
    ) -> List[RetrievedDocument]:
        # Stub implementation; later will call a real vector store.
        return []


class LexicalRetrievalProvider:
    async def query(
        self,
        query: str,
        *,
        top_k: int = 10,
        filters: Dict[str, Any] | None = None,
    ) -> List[RetrievedDocument]:
        # Stub implementation; later will call a real search backend.
        return []


