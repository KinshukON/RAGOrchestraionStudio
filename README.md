RAG Studio – Enterprise RAG Orchestration Platform
==================================================

RAG Studio is a browser-based, enterprise-grade platform for **designing, configuring, testing, and operating Retrieval-Augmented Generation (RAG) architectures** through a no-code / low-code visual interface.

The system is built as a **retrieval architecture control plane**, not a generic chatbot builder. It supports multiple RAG patterns as first-class citizens:

- Vector RAG
- Vectorless RAG
- Graph RAG
- Temporal RAG
- Hybrid RAG via a visual workflow designer

High-Level Architecture
-----------------------

- **Frontend**: React + TypeScript (Vite)
  - Left-hand navigation (Dashboard, Projects, RAG Templates, Workflow Builder, Data Sources, Query Studio, Evaluations, Deployments, Monitoring, Admin).
  - Central canvas for workflow and ingestion designers.
  - Right-hand configuration panels for nodes, projects, integrations, and environments.
- **Backend**: FastAPI (Python)
  - Modular routers for `projects`, `workflows`, `integrations`, `environments`, and `governance`.
  - Provider and connector abstraction layer (vector DB, graph DB, SQL, file/object storage, LLMs, embeddings, rerankers).
  - Workflow execution engine to execute node-based retrieval and orchestration flows.
  - Policy and governance layer (RBAC hooks, approvals, lineage, audit events).
- **Persistence** (to be wired to a real DB in later phases)
  - Relational DB for metadata (projects, workflows, environments, governance).
  - Pluggable connectors for vector DBs, graph DBs, document stores, and temporal indices.

Information Architecture
------------------------

Top-level navigation:

- **Dashboard** – Global view of environments, active deployments, recent evaluations, and alerts.
- **Projects** – Multi-project workspace for enterprise RAG initiatives, with project-level metadata and architecture selection.
- **RAG Templates** – Library of pre-defined RAG patterns (Vector, Vectorless, Graph, Temporal, Hybrid) that can seed workflows.
- **Workflow Builder** – Visual node-and-edge canvas to orchestrate retrieval and reasoning flows.
- **Data Sources** – Ingestion designer for connectors, parsing, chunking, enrichment, and index routing.
- **Query Studio** – Playground for prompt/query testing, retrieval traces, and side-by-side strategy comparisons.
- **Evaluations** – Query set testing, offline metrics, A/B experiments, and regression tracking.
- **Deployments** – Versioned deployment definitions, environment bindings, and rollout histories.
- **Monitoring** – Operational dashboards (latency, cost, quality proxies, errors, drift signals).
- **Admin**
  - **Integrations** – Central integrations hub for providers and data systems.
  - **Environments** – Dev / test / staging / prod mappings to concrete integrations.
  - **Access Control** – Role-based permissions and project-level scoping.
  - **Governance** – Policies, approvals, lineage views, and model usage configuration.
  - **Audit Logs** – Filterable, exportable activity log with query, workflow, and deployment context.

Key Data Models (Conceptual)
----------------------------

- **Project**
  - `id`, `name`, `business_domain`, `use_case_description`
  - `environment_tags[]`, `owners[]`, `deployment_status`
  - `selected_architecture_type` (Vector / Vectorless / Graph / Temporal / Hybrid)
  - `connected_integrations[]`, `workflow_versions[]`
- **WorkflowDefinition**
  - `id`, `project_id`, `name`, `description`, `version`, `architecture_type`
  - `nodes[]` (node type, config, position)
  - `edges[]` (source, target, condition)
  - `is_active`
- **IntegrationConfig**
  - `id`, `name`, `provider_type`, `credentials_reference`
  - `environment_mapping` (e.g. dev/stage/prod config ids)
  - `default_usage_policies`, `health_status`
- **EnvironmentConfig**
  - `id`, `name` (dev/test/staging/prod), `description`
  - `integration_bindings` (logical integration → concrete config id)
- **Governance**
  - Approval workflows, policy bundles, audit events, lineage pointers.

Example JSON Schemas (High Level)
---------------------------------

### Workflow definition (simplified)

```json
{
  "id": "wf_support_hybrid_rag",
  "project_id": "proj_support_portal",
  "name": "Support Hybrid RAG",
  "description": "Hybrid retrieval with vector, metadata, and graph hops.",
  "version": "1.0.0",
  "architecture_type": "hybrid",
  "nodes": [
    {
      "id": "n1",
      "type": "input_query",
      "name": "User Query",
      "config": {},
      "position": { "x": 80, "y": 120 }
    },
    {
      "id": "n2",
      "type": "query_classifier",
      "name": "Intent Classifier",
      "config": { "model_ref": "llm:intent-cls" },
      "position": { "x": 260, "y": 120 }
    },
    {
      "id": "n3",
      "type": "vector_retriever",
      "name": "Vector RAG",
      "config": {
        "index_ref": "vec:knowledge_base",
        "top_k": 20,
        "similarity_metric": "cosine",
        "metadata_filters": {}
      },
      "position": { "x": 480, "y": 40 }
    }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2" },
    { "id": "e2", "source": "n2", "target": "n3", "condition": "intent in ['faq','how_to']" }
  ],
  "is_active": true
}
```

### Integration configuration (simplified)

```json
{
  "id": "int_vectordb_prod",
  "name": "Production Vector DB",
  "provider_type": "vector_db",
  "credentials_reference": "vault:kv/vector-db/prod",
  "environment_mapping": {
    "dev": "vecdb-dev-cluster",
    "staging": "vecdb-staging-cluster",
    "prod": "vecdb-prod-cluster"
  },
  "default_usage_policies": {
    "max_qps": 100,
    "max_latency_ms": 500,
    "allowed_projects": ["*"]
  },
  "reusable": true,
  "health_status": "healthy"
}
```

### Project configuration (simplified)

```json
{
  "id": "proj_support_portal",
  "name": "Support Portal Assistant",
  "business_domain": "Customer Support",
  "use_case_description": "Assist agents with knowledge retrieval across tickets, KB, and product docs.",
  "environment_tags": [{ "name": "prod" }],
  "owners": [
    { "id": "u1", "name": "AI Architect", "role": "AI Architect" },
    { "id": "u2", "name": "Knowledge Engineer", "role": "Knowledge Engineer" }
  ],
  "deployment_status": "live",
  "selected_architecture_type": "hybrid",
  "connected_integrations": ["int_vectordb_prod", "int_llm_prod", "int_graphdb_prod"],
  "active_workflow_version_id": "wf_support_hybrid_rag@1.0.0"
}
```

Folder Structure (Current)
--------------------------

- `frontend/` – React + TypeScript (Vite) SPA
- `backend/`
  - `.venv/` – Python virtual environment
  - `main.py` – FastAPI app, router wiring
  - `routers/`
    - `projects.py`
    - `workflows.py`
    - `integrations.py`
    - `environments.py`
    - `governance.py`

Roadmap
-------

**MVP**

- Project workspace with basic CRUD and architecture selection metadata.
- RAG template catalog (Vector, Vectorless, Graph, Temporal, Hybrid) as selectable blueprints.
- Skeleton workflow builder UI (drag-and-drop-ready canvas, node config side panel).
- Data source & ingestion designer skeleton (pipelines with parsing/chunking/enrichment steps).
- Query Studio playground with retrieval trace stubs and side-by-side comparison layout.
- Admin console with integrations hub, environments, basic RBAC roles, and governance stubs.
- FastAPI backend with JSON schemas and in-memory storage (ready to be wired to a DB).

**Phase 2**

- Full workflow execution engine with node plugins and policy enforcement.
- Pluggable connector registry for common enterprise systems (vector DBs, graph DBs, data warehouses, document stores).
- Evaluation module with query sets, quality metrics, and A/B testing between workflows.
- Production monitoring (dashboards, alerts, cost tracking, and hallucination risk signals).
- Advanced mode for custom Python/JS logic in nodes (low-code extensibility).
- Deeper governance (approval workflows, lineage visualizations, fine-grained RBAC).

