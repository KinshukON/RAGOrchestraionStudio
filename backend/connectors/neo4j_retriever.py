"""
Neo4j Graph Retriever connector.
Performs multi-hop Cypher queries to retrieve entity-linked documents.
Falls back to simulated graph traversal data when NEO4J_URL is not configured.
"""
from __future__ import annotations

import time
from typing import List, Dict, Any


class GraphChunk:
    def __init__(
        self,
        id: str,
        content: str,
        score: float,
        source: str,
        relationships: List[Dict[str, Any]] | None = None,
        simulated: bool = False,
    ):
        self.id = id
        self.content = content
        self.score = score
        self.source = source
        self.relationships = relationships or []
        self.simulated = simulated

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "content": self.content,
            "score": round(self.score, 4),
            "source": self.source,
            "relationships": self.relationships,
            "simulated": self.simulated,
        }


_FIXTURE_GRAPH_TRAVERSAL = [
    {
        "id": "graph_001",
        "content": "RAG architectures connect multiple retrieval strategies through entity relationships.",
        "source": "kg:RAGArchitecture",
        "relationships": [
            {"type": "USES", "target": "VectorDB"},
            {"type": "USES", "target": "LLM"},
        ],
        "score": 0.91,
    },
    {
        "id": "graph_002",
        "content": "pgvector extends PostgreSQL with vector similarity search using HNSW and IVFFlat indexes.",
        "source": "kg:pgvector",
        "relationships": [
            {"type": "EXTENDS", "target": "PostgreSQL"},
            {"type": "IMPLEMENTS", "target": "HNSW"},
        ],
        "score": 0.85,
    },
]


async def retrieve_graph(
    query: str,
    top_k: int = 5,
) -> List[GraphChunk]:
    """
    Retrieve related entities via Cypher full-text + graph hop traversal.
    Falls back to fixture data when NEO4J_URL is not configured.
    """
    from config import get_settings
    settings = get_settings()
    start = time.perf_counter()

    if not settings.has_neo4j():
        return [
            GraphChunk(
                id=g["id"],
                content=g["content"],
                score=g["score"],
                source=g["source"],
                relationships=g["relationships"],
                simulated=True,
            )
            for g in _FIXTURE_GRAPH_TRAVERSAL[:top_k]
        ]

    try:
        from neo4j import AsyncGraphDatabase  # type: ignore

        driver = AsyncGraphDatabase.driver(
            settings.neo4j_url,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        async with driver.session() as session:
            result = await session.run(
                """
                CALL db.index.fulltext.queryNodes('documentIndex', $query)
                YIELD node, score
                OPTIONAL MATCH (node)-[r]->(related)
                RETURN node.id AS id,
                       node.content AS content,
                       node.source AS source,
                       score,
                       collect({type: type(r), target: related.name}) AS relationships
                LIMIT $top_k
                """,
                query=query,
                top_k=top_k,
            )
            chunks = []
            async for record in result:
                chunks.append(
                    GraphChunk(
                        id=record["id"],
                        content=record["content"],
                        score=float(record["score"]),
                        source=record.get("source", ""),
                        relationships=record.get("relationships", []),
                        simulated=False,
                    )
                )
            await driver.close()
            return chunks
    except Exception as exc:
        return [
            GraphChunk(
                id=g["id"],
                content=g["content"],
                score=g["score"],
                source=g["source"],
                relationships=g["relationships"],
                metadata={"error": str(exc)},
                simulated=True,
            )
            for g in _FIXTURE_GRAPH_TRAVERSAL[:top_k]
        ]
