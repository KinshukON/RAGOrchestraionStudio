from typing import List, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from db import get_session
from models_architecture import ArchitectureTemplate, DesignSession, ArchitectureType


router = APIRouter()


class ArchitectureTemplateOut(BaseModel):
    key: str
    type: ArchitectureType
    title: str
    short_definition: str
    when_to_use: str
    strengths: Dict[str, Any]
    tradeoffs: Dict[str, Any]
    typical_backends: Dict[str, Any]


class DesignSessionCreate(BaseModel):
    architecture_type: ArchitectureType
    project_id: int | None = None


class DesignSessionOut(BaseModel):
    id: int
    architecture_type: ArchitectureType
    project_id: int | None
    status: str
    wizard_state: Dict[str, Any]
    derived_architecture_definition: Dict[str, Any]


class DesignSessionUpdate(BaseModel):
  wizard_state: Dict[str, Any] | None = None
  derived_architecture_definition: Dict[str, Any] | None = None


def _seed_templates_if_empty() -> None:
    with get_session() as session:
        count = session.exec(select(ArchitectureTemplate)).first()
        if count is not None:
            return

        templates: list[ArchitectureTemplate] = [
            ArchitectureTemplate(
                key="vector",
                type="vector",
                title="Vector RAG",
                short_definition="Embed documents into vectors and retrieve by similarity search.",
                when_to_use="You have semi-structured or unstructured text and can maintain an embedding index.",
                strengths={
                    "high_recall": "Captures semantic similarity beyond exact keywords.",
                    "model_friendly": "Pairs naturally with modern embedding + LLM stacks.",
                },
                tradeoffs={
                    "index_cost": "Requires maintaining and refreshing an embedding index.",
                    "explainability": "Similarity scores can be harder to reason about than exact matches.",
                },
                typical_backends={
                    "embedding_model": ["OpenAI embeddings", "Cohere", "local huggingface model"],
                    "vector_store": ["pgvector", "Pinecone", "Weaviate", "Qdrant"],
                },
            ),
            ArchitectureTemplate(
                key="vectorless",
                type="vectorless",
                title="Vectorless RAG",
                short_definition="Rely on lexical and structural retrieval instead of embeddings.",
                when_to_use="You need strict control, low operational overhead, or operate on highly-structured fields.",
                strengths={
                    "deterministic": "Field and keyword-based retrieval is predictable and debuggable.",
                    "no_embedding_pipeline": "Avoids embedding generation and index management.",
                },
                tradeoffs={
                    "semantic_gap": "May miss semantically related content without explicit keywords.",
                },
                typical_backends={
                    "search": ["Postgres full-text", "Elasticsearch", "OpenSearch"],
                    "document_store": ["S3", "GCS", "SharePoint"],
                },
            ),
            ArchitectureTemplate(
                key="graph",
                type="graph",
                title="Graph RAG",
                short_definition="Retrieve over an explicit knowledge graph of entities and relations.",
                when_to_use="You have rich entities/relationships or need multi-hop reasoning and constraints.",
                strengths={
                    "structured_reasoning": "Makes multi-hop and constraint-based retrieval first-class.",
                },
                tradeoffs={
                    "modeling_overhead": "Requires building and maintaining a graph/ontology.",
                },
                typical_backends={
                    "graph_db": ["Neo4j", "Amazon Neptune", "ArangoDB"],
                    "nlp": ["entity extraction pipelines"],
                },
            ),
            ArchitectureTemplate(
                key="temporal",
                type="temporal",
                title="Temporal RAG",
                short_definition="Time-aware retrieval over effective-dated facts and event sequences.",
                when_to_use="You care about what was true at a specific time or how facts change over time.",
                strengths={
                    "time_correctness": "Supports as-of queries and recency weighting.",
                },
                tradeoffs={
                    "index_complexity": "Requires careful modeling of versions and event timelines.",
                },
                typical_backends={
                    "stores": ["time-series DB", "temporal tables in SQL"],
                },
            ),
            ArchitectureTemplate(
                key="hybrid",
                type="hybrid",
                title="Hybrid RAG",
                short_definition="Compose multiple retrieval modes (vector, lexical, graph, temporal) in one system.",
                when_to_use="You need the strengths of multiple strategies and can afford the complexity.",
                strengths={
                    "flexibility": "Route queries to the best strategy or fuse multiple signals.",
                },
                tradeoffs={
                    "governance": "More moving parts to validate, observe, and approve.",
                },
                typical_backends={
                    "orchestration": ["RAG Studio workflows", "custom orchestration layer"],
                },
            ),
            ArchitectureTemplate(
                key="custom",
                type="custom",
                title="Custom RAG",
                short_definition="Start from building blocks and design a bespoke retrieval orchestration.",
                when_to_use="You have highly-specific constraints or want to experiment beyond standard patterns.",
                strengths={
                    "expressiveness": "Design exactly the stages and controls you need.",
                },
                tradeoffs={
                    "design_effort": "Requires more upfront design and validation work.",
                },
                typical_backends={
                    "varies": ["Any combination of supported providers and stores"],
                },
            ),
        ]

        for tpl in templates:
            session.add(tpl)
        session.commit()


@router.get("/catalog", response_model=List[ArchitectureTemplateOut])
async def list_architecture_catalog() -> List[ArchitectureTemplateOut]:
    import traceback as _tb
    try:
        _seed_templates_if_empty()
    except Exception as seed_exc:
        # Don't fail the whole request if seeding fails — table might already have data
        import logging
        logging.getLogger(__name__).warning("Seeding failed: %s", seed_exc)

    try:
        with get_session() as session:
            rows = list(session.exec(select(ArchitectureTemplate)))
        return [
            ArchitectureTemplateOut(
                key=row.key,
                type=row.type,
                title=row.title,
                short_definition=row.short_definition,
                when_to_use=row.when_to_use,
                strengths=row.strengths,
                tradeoffs=row.tradeoffs,
                typical_backends=row.typical_backends,
            )
            for row in rows
        ]
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Catalog error: {type(exc).__name__}: {exc}\n\n{_tb.format_exc()}",
        ) from exc



@router.post("/design-sessions", response_model=DesignSessionOut)
async def create_design_session(payload: DesignSessionCreate) -> DesignSessionOut:
    with get_session() as session:
        session_obj = DesignSession(
            architecture_type=payload.architecture_type,
            project_id=payload.project_id,
            status="in_progress",
        )
        session.add(session_obj)
        session.commit()
        session.refresh(session_obj)
        return DesignSessionOut(
            id=session_obj.id or 0,
            architecture_type=session_obj.architecture_type,
            project_id=session_obj.project_id,
            status=session_obj.status,
            wizard_state=session_obj.wizard_state,
            derived_architecture_definition=session_obj.derived_architecture_definition,
        )


@router.get("/design-sessions/{session_id}", response_model=DesignSessionOut)
async def get_design_session(session_id: int) -> DesignSessionOut:
    with get_session() as session:
        ds = session.get(DesignSession, session_id)
        if not ds:
            raise HTTPException(status_code=404, detail="Design session not found")
        return DesignSessionOut(
            id=ds.id or 0,
            architecture_type=ds.architecture_type,
            project_id=ds.project_id,
            status=ds.status,
            wizard_state=ds.wizard_state,
            derived_architecture_definition=ds.derived_architecture_definition,
        )


@router.patch("/design-sessions/{session_id}", response_model=DesignSessionOut)
async def update_design_session(session_id: int, payload: DesignSessionUpdate) -> DesignSessionOut:
    with get_session() as session:
        ds = session.get(DesignSession, session_id)
        if not ds:
            raise HTTPException(status_code=404, detail="Design session not found")
        if payload.wizard_state is not None:
            ds.wizard_state = payload.wizard_state
        if payload.derived_architecture_definition is not None:
            ds.derived_architecture_definition = payload.derived_architecture_definition
        session.add(ds)
        session.commit()
        session.refresh(ds)
        return DesignSessionOut(
            id=ds.id or 0,
            architecture_type=ds.architecture_type,
            project_id=ds.project_id,
            status=ds.status,
            wizard_state=ds.wizard_state,
            derived_architecture_definition=ds.derived_architecture_definition,
        )

