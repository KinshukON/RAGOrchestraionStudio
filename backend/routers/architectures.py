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
    """Upsert architecture templates — inserts any templates whose key is not already in the DB."""
    with get_session() as session:

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
            # ── New architectures ──────────────────────────────────────────
            ArchitectureTemplate(
                key="agentic",
                type="agentic",
                title="Agentic RAG",
                short_definition="Autonomous agents decide what to retrieve, when, and how using tool calls.",
                when_to_use="You need dynamic, multi-step retrieval with tool use and autonomous decision-making.",
                strengths={
                    "dynamic_retrieval": "Agents decide retrieval strategy based on the query.",
                    "tool_use": "Can call external APIs, databases, and tools as needed.",
                    "complex_tasks": "Handles multi-turn, complex information gathering.",
                },
                tradeoffs={
                    "unpredictable": "Agent decisions can be hard to debug and reproduce.",
                    "latency": "Multiple tool calls increase end-to-end latency.",
                    "cost": "More LLM calls per query mean higher cost.",
                },
                typical_backends={
                    "agents": ["LangChain Agents", "OpenAI GPT-4 with Plugins", "Microsoft Semantic Kernel"],
                    "tools": ["Custom tool APIs", "function calling", "ReAct prompting"],
                },
            ),
            ArchitectureTemplate(
                key="modular",
                type="modular",
                title="Modular RAG",
                short_definition="Independent, swappable modules for retrieval, reasoning, and generation.",
                when_to_use="Large collaborative projects needing frequent updates to individual pipeline components.",
                strengths={
                    "flexibility": "Swap any module without affecting the rest of the pipeline.",
                    "scalability": "Each module scales independently via microservices.",
                    "maintainability": "Clear boundaries make debugging and testing easier.",
                },
                tradeoffs={
                    "integration_overhead": "Module interfaces and data contracts need careful design.",
                    "deployment_complexity": "Multiple services to deploy and monitor.",
                },
                typical_backends={
                    "orchestration": ["Microservices Architecture", "Docker & Kubernetes", "Apache Kafka"],
                },
            ),
            ArchitectureTemplate(
                key="memory_augmented",
                type="memory_augmented",
                title="Memory-Augmented RAG",
                short_definition="External memory storage and retrieval for long-term context and personalization.",
                when_to_use="Chatbots maintaining long-term context or providing personalized recommendations.",
                strengths={
                    "continuity": "Remembers past interactions across sessions.",
                    "personalization": "Adapts responses based on user history and preferences.",
                },
                tradeoffs={
                    "memory_management": "Memory can grow unbounded without pruning strategies.",
                    "privacy": "Stored user context raises data privacy considerations.",
                },
                typical_backends={
                    "memory_store": ["Redis", "Amazon DynamoDB"],
                    "vector_store": ["Pinecone Vector Database"],
                },
            ),
            ArchitectureTemplate(
                key="multimodal",
                type="multimodal",
                title="Multi-Modal RAG",
                short_definition="Cross-modal retrieval across text, images, audio, and video.",
                when_to_use="You need to process and retrieve from multiple data types — text, images, audio.",
                strengths={
                    "rich_responses": "Combines information from multiple modalities for richer answers.",
                    "accessibility": "Handles diverse input types in one pipeline.",
                },
                tradeoffs={
                    "model_complexity": "Requires multi-modal embedding models and alignment.",
                    "compute_cost": "Processing multiple modalities is compute-intensive.",
                },
                typical_backends={
                    "models": ["OpenAI CLIP", "TensorFlow Hub Models", "PyTorch Multi-Modal Libraries"],
                },
            ),
            ArchitectureTemplate(
                key="federated",
                type="federated",
                title="Federated RAG",
                short_definition="Decentralized data sources with privacy-preserving retrieval across organizations.",
                when_to_use="Healthcare systems handling sensitive data or cross-organization collaboration.",
                strengths={
                    "data_security": "Data stays at source — only query results are shared.",
                    "compliance": "Meets data residency and privacy regulations.",
                },
                tradeoffs={
                    "latency": "Querying across federated sources adds network latency.",
                    "consistency": "Different sources may have inconsistent schemas.",
                },
                typical_backends={
                    "frameworks": ["TensorFlow Federated", "PySyft by OpenMined", "Federated Learning Libraries"],
                },
            ),
            ArchitectureTemplate(
                key="streaming",
                type="streaming",
                title="Streaming RAG",
                short_definition="Real-time data retrieval and generation from live event streams.",
                when_to_use="Live reporting, financial tickers, social media monitoring — data arrives continuously.",
                strengths={
                    "real_time": "Up-to-date information with sub-second latency.",
                    "live_data": "Processes events as they arrive, no batch delays.",
                },
                tradeoffs={
                    "infrastructure": "Requires stream processing infrastructure (Kafka, Kinesis).",
                    "ordering": "Event ordering and exactly-once processing are complex.",
                },
                typical_backends={
                    "streaming": ["Apache Kafka Streams", "Amazon Kinesis", "Spark Streaming"],
                },
            ),
            ArchitectureTemplate(
                key="contextual",
                type="contextual",
                title="Contextual Retrieval RAG",
                short_definition="Context-aware retrieval using conversation history and session state.",
                when_to_use="Conversational AI and customer support chatbots that need to maintain session context.",
                strengths={
                    "personalization": "Understands user intent through conversation history.",
                    "coherence": "Generates contextually relevant follow-up answers.",
                },
                tradeoffs={
                    "context_window": "Growing conversation history can exceed context limits.",
                    "state_management": "Requires session state storage and management.",
                },
                typical_backends={
                    "frameworks": ["Dialogflow by Google", "Rasa Open Source", "Microsoft Bot Framework"],
                },
            ),
            ArchitectureTemplate(
                key="knowledge_enhanced",
                type="knowledge_enhanced",
                title="Knowledge-Enhanced RAG",
                short_definition="Integration of structured knowledge bases, ontologies, and domain taxonomies.",
                when_to_use="Educational tools and professional domain apps (legal, medical, financial).",
                strengths={
                    "factual_accuracy": "Grounded in verified, structured knowledge.",
                    "domain_expertise": "Leverages expert-curated ontologies and taxonomies.",
                },
                tradeoffs={
                    "knowledge_curation": "Requires building and maintaining structured knowledge.",
                    "schema_evolution": "Ontology changes ripple through the retrieval pipeline.",
                },
                typical_backends={
                    "knowledge": ["Knowledge Graph Embedding Libraries", "OWL APIs", "Apache Jena"],
                },
            ),
            ArchitectureTemplate(
                key="self_rag",
                type="self_rag",
                title="Self-RAG",
                short_definition="Self-reflection mechanisms with iterative refinement of retrieved content.",
                when_to_use="Content creation tools and high-accuracy educational platforms.",
                strengths={
                    "accuracy": "Self-evaluates and iterates on retrieval quality.",
                    "coherence": "Generates more coherent and well-reasoned responses.",
                },
                tradeoffs={
                    "latency": "Multiple reflection iterations increase response time.",
                    "complexity": "Self-evaluation logic adds implementation complexity.",
                },
                typical_backends={
                    "models": ["OpenAI GPT models with fine-tuning", "Human-in-the-Loop platforms"],
                },
            ),
            ArchitectureTemplate(
                key="hyde",
                type="hyde",
                title="HyDE RAG",
                short_definition="Hypothetical Document Embeddings — generates a hypothetical answer to guide retrieval.",
                when_to_use="Complex queries with implicit meaning or niche research fields.",
                strengths={
                    "recall": "Generates better retrieval queries through hypothetical documents.",
                    "answer_quality": "Bridges the gap between query intent and document language.",
                },
                tradeoffs={
                    "extra_llm_call": "Requires an additional LLM generation step before retrieval.",
                    "noise": "Hypothetical documents can introduce false positive retrievals.",
                },
                typical_backends={
                    "implementations": ["Custom Transformer implementations", "Haystack Pipelines"],
                },
            ),
            ArchitectureTemplate(
                key="recursive",
                type="recursive",
                title="Recursive / Multi-Step RAG",
                short_definition="Multiple rounds of retrieval and generation for deep analytical tasks.",
                when_to_use="Analytical & problem-solving tasks, multi-turn dialogue systems.",
                strengths={
                    "depth": "Enhanced reasoning through iterative retrieve-then-generate cycles.",
                    "understanding": "Builds deeper comprehension with each round.",
                },
                tradeoffs={
                    "latency": "Multiple retrieval rounds multiply end-to-end time.",
                    "cost": "Each round consumes additional LLM and retrieval resources.",
                },
                typical_backends={
                    "frameworks": ["LangChain chains & agents", "DeepMind AlphaCode framework"],
                },
            ),
            ArchitectureTemplate(
                key="domain_specific",
                type="domain_specific",
                title="Domain-Specific RAG",
                short_definition="Customized retrieval pipelines tailored for specific industries and domains.",
                when_to_use="Legal research, medical diagnosis support, financial analysis tools.",
                strengths={
                    "relevance": "Tuned for domain-specific terminology and patterns.",
                    "compliance": "Built-in regulatory and domain constraints.",
                    "trustworthiness": "Higher accuracy within the target domain.",
                },
                tradeoffs={
                    "narrow_scope": "Not generalizable to other domains.",
                    "expertise_required": "Requires domain expert involvement in pipeline design.",
                },
                typical_backends={
                    "platforms": ["LexPredict Contract Analytics", "Watson Health", "Financial NLP Tools"],
                },
            ),
        ]

        for tpl in templates:
            # Upsert: skip if key already exists
            existing = session.exec(
                select(ArchitectureTemplate).where(ArchitectureTemplate.key == tpl.key)
            ).first()
            if not existing:
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


# ── WS-5: Tiered Catalog ─────────────────────────────────────────────────

_ARCHITECTURE_TIERS = {
    "core": {
        "label": "Core Architectures",
        "description": "Production-proven patterns with full tooling support.",
        "architectures": ["vector", "vectorless", "graph", "temporal", "hybrid"],
    },
    "advanced": {
        "label": "Advanced Architectures",
        "description": "Sophisticated patterns for specialized enterprise use cases.",
        "architectures": ["agentic", "modular", "custom", "self_rag", "hyde"],
    },
    "specialized": {
        "label": "Specialized Architectures",
        "description": "Domain-specific and emerging patterns.",
        "architectures": ["memory_augmented", "multimodal", "federated", "streaming", "contextual", "knowledge_enhanced", "recursive", "domain_specific"],
    },
}


@router.get("/catalog/tiered")
async def tiered_catalog() -> dict:
    """Group architectures into Core / Advanced / Specialized tiers."""
    try:
        _seed_templates_if_empty()
    except Exception:
        pass

    with get_session() as session:
        rows = list(session.exec(select(ArchitectureTemplate)))
    by_key = {r.key: r for r in rows}

    tiers = []
    for tier_key, tier_info in _ARCHITECTURE_TIERS.items():
        archs = []
        for key in tier_info["architectures"]:
            t = by_key.get(key)
            if t:
                archs.append({
                    "key": t.key, "type": t.type, "title": t.title,
                    "short_definition": t.short_definition,
                    "readiness": "production" if tier_key == "core" else ("beta" if tier_key == "advanced" else "experimental"),
                    "has_benchmark_pack": key in _BENCHMARK_PACKS,
                    "has_governance_profile": key in _GOVERNANCE_PROFILES,
                })
        tiers.append({
            "tier": tier_key,
            "label": tier_info["label"],
            "description": tier_info["description"],
            "architecture_count": len(archs),
            "architectures": archs,
        })
    return {"tiers": tiers, "total_architectures": len(rows)}


# ── WS-5: Per-Architecture Governance Profiles ───────────────────────────

_GOVERNANCE_PROFILES = {
    "vector": {"quality_threshold": 0.75, "approval_required": False, "max_latency_ms": 2000, "cost_limit_per_query": 0.05, "allowed_environments": ["development", "staging", "production"]},
    "vectorless": {"quality_threshold": 0.80, "approval_required": False, "max_latency_ms": 1000, "cost_limit_per_query": 0.02, "allowed_environments": ["development", "staging", "production"]},
    "graph": {"quality_threshold": 0.70, "approval_required": True, "max_latency_ms": 5000, "cost_limit_per_query": 0.10, "allowed_environments": ["development", "staging", "production"]},
    "temporal": {"quality_threshold": 0.75, "approval_required": False, "max_latency_ms": 3000, "cost_limit_per_query": 0.06, "allowed_environments": ["development", "staging", "production"]},
    "hybrid": {"quality_threshold": 0.80, "approval_required": True, "max_latency_ms": 4000, "cost_limit_per_query": 0.08, "allowed_environments": ["development", "staging", "production"]},
    "agentic": {"quality_threshold": 0.65, "approval_required": True, "max_latency_ms": 10000, "cost_limit_per_query": 0.20, "allowed_environments": ["development", "staging"]},
    "self_rag": {"quality_threshold": 0.85, "approval_required": True, "max_latency_ms": 8000, "cost_limit_per_query": 0.15, "allowed_environments": ["development", "staging"]},
    "hyde": {"quality_threshold": 0.75, "approval_required": False, "max_latency_ms": 5000, "cost_limit_per_query": 0.10, "allowed_environments": ["development", "staging"]},
    "recursive": {"quality_threshold": 0.70, "approval_required": True, "max_latency_ms": 12000, "cost_limit_per_query": 0.25, "allowed_environments": ["development"]},
    "knowledge_enhanced": {"quality_threshold": 0.80, "approval_required": True, "max_latency_ms": 6000, "cost_limit_per_query": 0.12, "allowed_environments": ["development", "staging"]},
}


@router.get("/governance-profiles")
async def list_governance_profiles() -> dict:
    """Return per-architecture governance defaults."""
    return {"profiles": _GOVERNANCE_PROFILES}


@router.get("/governance-profiles/{arch_type}")
async def get_governance_profile(arch_type: str) -> dict:
    profile = _GOVERNANCE_PROFILES.get(arch_type)
    if not profile:
        raise HTTPException(404, f"No governance profile for '{arch_type}'")
    return {"architecture_type": arch_type, **profile}


# ── WS-5: Architecture Benchmark Packs ───────────────────────────────────

_BENCHMARK_PACKS = {
    "vector": {
        "label": "Vector RAG Benchmark Pack",
        "datasets": ["MS MARCO", "Natural Questions", "BEIR Suite"],
        "expected_recall_range": [0.70, 0.85],
        "expected_latency_range_ms": [200, 500],
        "query_types": ["factoid", "short-answer", "passage-retrieval"],
    },
    "vectorless": {
        "label": "Vectorless RAG Benchmark Pack",
        "datasets": ["MS MARCO (BM25)", "TREC-DL", "Elasticsearch Eval"],
        "expected_recall_range": [0.60, 0.75],
        "expected_latency_range_ms": [50, 200],
        "query_types": ["keyword-match", "exact-phrase", "structured-query"],
    },
    "graph": {
        "label": "Graph RAG Benchmark Pack",
        "datasets": ["HotpotQA", "MuSiQue", "2WikiMultiHopQA"],
        "expected_recall_range": [0.55, 0.70],
        "expected_latency_range_ms": [500, 1500],
        "query_types": ["multi-hop", "relational", "constraint-based"],
    },
    "temporal": {
        "label": "Temporal RAG Benchmark Pack",
        "datasets": ["TimeQA", "TemporalQuestions", "Policy-versioned QA"],
        "expected_recall_range": [0.65, 0.80],
        "expected_latency_range_ms": [250, 600],
        "query_types": ["as-of-date", "version-aware", "recency-weighted"],
    },
    "hybrid": {
        "label": "Hybrid RAG Benchmark Pack",
        "datasets": ["BEIR Suite", "MS MARCO + BM25 Fusion", "Enterprise QA Mix"],
        "expected_recall_range": [0.80, 0.92],
        "expected_latency_range_ms": [300, 800],
        "query_types": ["mixed-intent", "multi-signal", "enterprise-knowledge"],
    },
}


@router.get("/catalog/{arch_key}/benchmark-pack")
async def get_benchmark_pack(arch_key: str) -> dict:
    """Return architecture-specific benchmark datasets and expected quality ranges."""
    pack = _BENCHMARK_PACKS.get(arch_key)
    if not pack:
        return {"architecture_type": arch_key, "available": False, "message": f"No benchmark pack available for '{arch_key}' yet."}
    return {"architecture_type": arch_key, "available": True, **pack}


# ── WS-5: Architecture-Specific Features ─────────────────────────────────

_ARCH_FEATURES = {
    "vector": ["Embedding Explorer", "Similarity Score Visualizer", "Index Health Monitor"],
    "vectorless": ["BM25 Query Debugger", "Keyword Highlight", "Full-Text Index Monitor"],
    "graph": ["Graph Traversal Visualizer", "Entity Relationship Explorer", "Cypher Query Editor"],
    "temporal": ["Temporal Date Range Selector", "Version Timeline", "Recency Decay Curve Editor"],
    "hybrid": ["Retrieval Signal Fusion Debugger", "Reranker Score Inspector", "Multi-Strategy Router"],
    "agentic": ["Agent Decision Tree Viewer", "Tool Call Timeline", "Reasoning Trace Panel"],
    "self_rag": ["Self-Evaluation Score Tracker", "Iteration Depth Monitor", "Reflection Log"],
    "hyde": ["Hypothetical Document Preview", "Query Expansion Viewer", "Embedding Comparison"],
}


@router.get("/catalog/{arch_key}/features")
async def get_arch_features(arch_key: str) -> dict:
    """Return architecture-specific UI features."""
    features = _ARCH_FEATURES.get(arch_key, [])
    return {"architecture_type": arch_key, "features": features, "feature_count": len(features)}
