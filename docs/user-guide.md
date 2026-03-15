# RAG Orchestration Studio — User Guide

> **Live site**: [ragorchestrationstudio.com](https://ragorchestrationstudio.com)  
> Sign in with your Google account to access the platform.

---

## Table of Contents

1. [Signing In](#1-signing-in)
2. [Architecture Catalog](#2-architecture-catalog)
3. [Guided Designer — Configure your pipeline](#3-guided-designer--configure-your-pipeline)
4. [Guided Designer — Generate Workflow](#4-guided-designer--generate-workflow)
5. [Workflow Builder — Node Configuration](#5-workflow-builder--node-configuration)
6. [Query Lab](#6-query-lab)
7. [Integrations](#7-integrations)
8. [Environments](#8-environments)
9. [Governance & Guardrails](#9-governance--guardrails)
10. [Observability & Traces](#10-observability--traces)
11. [Admin — Users, Roles & Teams](#11-admin--users-roles--teams)
12. [Evidence — Evaluation Harness](#12-evidence--evaluation-harness)
13. [Evidence — Research Assistant](#13-evidence--research-assistant)

---

## 1. Signing In

Navigate to [ragorchestrationstudio.com](https://ragorchestrationstudio.com) and click **Continue with Google**. The platform uses Google OAuth — you'll be redirected back immediately after authentication.

![Landing page](file:///Users/kinshukdutta/.gemini/antigravity/brain/0ff180c0-debb-4a64-a13c-d77151a12a27/00_landing_1773472409626.png)

---

## 2. Architecture Catalog

**Sidebar: Architecture → Catalog**

The catalog is your starting point. It presents **6 RAG architecture patterns**, each with a description, when-to-use guidance, strengths & tradeoffs, and typical backend components.

### Row 1 — Core architectures

![Architecture Catalog — Vector, Vectorless, Graph](file:///Users/kinshukdutta/.gemini/antigravity/brain/0ff180c0-debb-4a64-a13c-d77151a12a27/catalog_full_view_1773472557006.png)

| Architecture | Best For |
|---|---|
| **Vector RAG** | Semantic similarity over embedded text corpora |
| **Vectorless RAG** | Structured data, strict precision, no embedding overhead |
| **Graph RAG** | Entity-rich data requiring multi-hop reasoning |

### Row 2 — Advanced architectures

![Architecture Catalog — Temporal, Hybrid, Custom](file:///Users/kinshukdutta/.gemini/antigravity/brain/0ff180c0-debb-4a64-a13c-d77151a12a27/catalog_scrolled_1773472558678.png)

| Architecture | Best For |
|---|---|
| **Temporal RAG** | Time-aware retrieval over event sequences |
| **Hybrid RAG** | Combining vector, lexical, and graph strategies |
| **Custom RAG** | Bespoke pipelines beyond standard patterns |

➡️ Click **"Design this architecture"** on any card to open the Guided Designer pre-configured for that type.

---

## 3. Guided Designer — Configure your pipeline

**Sidebar: Architecture → Guided Designer**

After clicking "Design this architecture", the Guided Designer opens. The left panel shows a **3-step navigation**: Architecture profile → Retrieval & routing → Answering & governance. The right panel shows all configuration fields **simultaneously** across three columns.

### Step 1 — Architecture profile

![Guided Designer — Step 1: Architecture profile selected](file:///Users/kinshukdutta/.gemini/antigravity/brain/0ff180c0-debb-4a64-a13c-d77151a12a27/designer_step1_1773472577684.png)

Configure the core data & indexing layer:

- **Data source type** — where your documents come from (file store, SQL, data warehouse…)
- **Chunking strategy** — how documents are split (e.g. `semantic`, `fixed-size`)
- **Embedding model** — model used to generate vectors (e.g. `text-embedding-3-large`)
- **Vector database** — the store for embeddings (pgvector, Pinecone, Weaviate, Qdrant)

### Step 2 — Retrieval & routing

![Guided Designer — Step 2: Retrieval & routing selected](file:///Users/kinshukdutta/.gemini/antigravity/brain/0ff180c0-debb-4a64-a13c-d77151a12a27/designer_step2_1773472584015.png)

Define how queries are matched to content:

- **Similarity metric** — `cosine`, dot product, L2
- **Top K** — number of chunks to retrieve (default 8)
- **Metadata filters** — DSL expressions to narrow results
- **Reranker** — optional cross-encoder or SaaS reranker to re-score retrieved chunks

### Step 3 — Answering & governance (preview)

![Guided Designer — Step 3: Answering & governance selected, Generate workflow button visible](file:///Users/kinshukdutta/.gemini/antigravity/brain/0ff180c0-debb-4a64-a13c-d77151a12a27/designer_step3_1773472590110.png)

Set the answer generation layer:

- **Answer generation model** — the LLM for final answer synthesis
- **Fallback strategy** — what to do when retrieval returns nothing (`llm_fallback`, `no_answer`…)

---

## 4. Guided Designer — Generate Workflow

Once all configuration sections are reviewed, click the **"Generate workflow →"** button at the bottom-right of the designer.

![Generate workflow — processing state (button shows "Generating workflow…")](file:///Users/kinshukdutta/.gemini/antigravity/brain/0ff180c0-debb-4a64-a13c-d77151a12a27/designer_generate_workflow_1773472604859.png)

The button transitions to **"Generating workflow…"** while the backend builds the pipeline. After a moment, you are automatically redirected to the **Workflow Builder** with the generated graph ready to inspect.

> You can also click **"Save draft"** at any time to persist the designer session without generating a workflow yet.

---

## 5. Workflow Builder — Node Configuration

**Sidebar: Architecture → Workflow Builder**

The Workflow Builder visualises your RAG pipeline as a **node-based directed graph**. Each node is a processing step; edges represent data flow between steps.

![Workflow Builder — generated Vector RAG pipeline with node palette and canvas](file:///Users/kinshukdutta/.gemini/antigravity/brain/0ff180c0-debb-4a64-a13c-d77151a12a27/workflow_builder_detail_1773472613905.png)

### Layout

| Panel | Purpose |
|---|---|
| **Left — Nodes palette** | All available node types grouped by category: Input & Routing, Retrieval, Processing, Generation |
| **Centre — Canvas** | The live pipeline graph. Zoom with `+`/`−`, fit-to-window with the fullscreen icon |
| **Right — Configuration** | Click any node to expose its full deep-config panel |

### Deep Node Configuration

Clicking any canvas node opens a **deep configuration panel** with parameter groups specific to that node type. Every configurable dimension has a slider, dropdown, or textarea.

| Node type | Key parameters |
|---|---|
| **Embedding generator** | Chunking strategy (recursive / sentence / semantic / sliding window), chunk size (64–4096 tokens), chunk overlap, embedding model (OpenAI / Cohere / BGE / E5 / custom), batch size, vector store (pgvector / Pinecone / Weaviate / Qdrant / Milvus / Chroma / OpenSearch) |
| **Vector retriever** | Top-K (slider), similarity metric (cosine / dot / L2), ANN algorithm (HNSW / IVFFlat / Exact), metadata pre-filter DSL, MMR diversity lambda |
| **Lexical retriever** | Algorithm (BM25 / TF-IDF / BM25+ / SPL), BM25 k1 + b sliders, index backend (Elasticsearch / Typesense / Meilisearch / Tantivy) |
| **Graph retriever** | Traversal algorithm (BFS / DFS / PPR / Beam), max hop depth, max node cap, edge-type allowlist / blocklist, graph DB (Neo4j / Neptune / TigerGraph / NebulaGraph) |
| **Temporal filter** | As-of date source (request date / extracted / fixed / session param), effective-from/to field names, lookback window, strict point-in-time toggle |
| **Reranker** | Model (Cohere / Cross-encoder / BGE / custom), top-K after rerank, cross-encoder mode, score passthrough |
| **LLM answer generator** | Model (GPT-4o / Claude / Gemini / Llama / Mistral / custom), max tokens, temperature slider, top-P, system prompt textarea, streaming toggle |
| **Query classifier** | Classifier type (LLM / zero-shot / fine-tuned / rule), intent label list, confidence threshold |
| **Metadata filter** | Filter DSL expression (multi-line with AND/OR/NOT), pass-through on empty toggle |
| **Guardrail** | PII / toxicity / injection / hallucination checks independently, violation action (block / redact / warn / fallback) |
| **Context assembler** | Merge strategy (RRF / weighted / deduplicate / concat), max context token cap |

### Actions

| Button | Effect |
|---|---|
| **Save Draft** | Persist the current state without publishing |
| **Publish** | Mark the workflow as active and available in Query Lab |

---

## 6. Query Lab

**Sidebar: Query Lab**

Test your workflows interactively and compare retrieval strategies side-by-side.

![Query Lab — Vector RAG workflow loaded and ready to run](file:///Users/kinshukdutta/.gemini/antigravity/brain/0ff180c0-debb-4a64-a13c-d77151a12a27/querylab_with_workflow_1773472627110.png)

### Controls

| Field | Description |
|---|---|
| **Workflow** | Select from all draft/published workflows |
| **Environment** | Target environment: dev, staging, prod |
| **Query text** | Your test question or instruction |
| **Strategies to compare** | Tick any combination: Vector, Vectorless, Graph, Temporal, Hybrid |
| **Top-k** | Retrieval hint — number of chunks returned |

Click **"Run simulation"** to execute.

### Results Cards (IEEE Evidence Layer)

Each strategy returns a **comparison card** showing:

- **Experiment ID** — a citeable `exp-XXXXXX` identifier for this exact run, useful for IEEE evidence logging
- **Latency bar** — visual relative benchmark across strategies
- **Retrieved chunks** — the top-scored chunks with source attribution and relevance scores
- **Retrieval path** — the sequence of pipeline nodes traversed
- **Answer** — the generated response
- **Export** — download the run as JSON for offline analysis

### Run History

Every simulation is logged in the **Run History** panel below the results. You can:

- **Search** runs by query text, strategy, or experiment ID
- **Expand** any row to see full result detail
- **Export** selected runs as CSV for reporting

> _"Backend returns simulated traces"_ appears when no real API keys are configured. Connect an LLM provider in **Integrations** to enable live execution.

---

## 7. Integrations

**Sidebar: Integrations**

![Integrations page](file:///Users/kinshukdutta/.gemini/antigravity/brain/0ff180c0-debb-4a64-a13c-d77151a12a27/06_integrations_1773472354401.png)

Manage connectors to LLM providers, vector stores, and document sources. Once an integration is configured with API keys, Query Lab automatically switches from simulated to live execution.

**Supported connector categories**: LLM providers (OpenAI, Anthropic, Cohere), vector stores (pgvector, Pinecone, Weaviate, Qdrant), document sources (S3, GCS, SharePoint, SQL), graph databases (Neo4j, Amazon Neptune, ArangoDB).

---

## 8. Environments

**Sidebar: Environments**

![Environments page](file:///Users/kinshukdutta/.gemini/antigravity/brain/0ff180c0-debb-4a64-a13c-d77151a12a27/07_environments_1773472359642.png)

Environments are deployment targets for your workflows. Each has its own integration bindings and configuration overrides.

| Environment | Typical Use |
|---|---|
| **dev** | Local/sandbox testing, simulated execution |
| **staging** | Pre-production validation with real LLMs |
| **prod** | Live deployment serving end-user queries |

Promote workflows from `dev → staging → prod`. Promotion triggers any approval gates defined in Governance.

---

## 9. Governance & Guardrails

**Sidebar: Governance**

![Governance & Guardrails](file:///Users/kinshukdutta/.gemini/antigravity/brain/0ff180c0-debb-4a64-a13c-d77151a12a27/governance_detail_1773472634400.png)

Define and enforce policies across the platform lifecycle.

| Policy Scope | Example |
|---|---|
| `workflow` | Require 2 approvals before publishing |
| `environment` | Block promotion if evaluation score < threshold |
| `architecture` | Whitelist permitted architecture types |

Approval gates can be attached to any lifecycle action (publish, promote) and specify required roles and escalation paths.

---

## 10. Observability & Traces

**Sidebar: Observability**

![Observability & Trace Analytics](file:///Users/kinshukdutta/.gemini/antigravity/brain/0ff180c0-debb-4a64-a13c-d77151a12a27/observability_detail_1773472637955.png)

Monitor every workflow run. The module captures:

- **Run history** — timestamped log of every execution with status (success / failure / timeout)
- **Trace analytics** — per-node latency breakdown for a selected run
- **Audit trail** — who published, promoted, or modified which workflow

Use date, environment, and status filters to drill into specific runs.

---

## 11. Admin — Users, Roles & Teams

**Sidebar: Admin**

![Admin Users page](file:///Users/kinshukdutta/.gemini/antigravity/brain/0ff180c0-debb-4a64-a13c-d77151a12a27/10_admin_users_screenshot_1773472381716.png)

### Users

View all platform users, their assigned roles, and last login. Invite new users by email — they sign in via Google OAuth.

### Roles

RAG Studio uses RBAC. Default roles:

| Role | Access |
|---|---|
| **Platform Admin** | Full access including admin pages and governance |
| **AI Architect** | Create/edit workflows, publish, manage integrations |
| **ML Engineer** | Edit workflows and run Query Lab |
| **Viewer** | Read-only across all modules |

### Teams

Group users into teams to scope workflow ownership and governance approval routing.

---

## 12. Evidence — Evaluation Harness

**Sidebar: Evidence → Evaluation Harness**

The Evaluation Harness provides a structured **benchmark test suite** for measuring and comparing RAG strategy quality across standardised enterprise queries.

### Left panel — Benchmark queries

Six canonical enterprise RAG queries are pre-seeded (covering multi-hop reasoning, temporal compliance, entity disambiguation, cross-document synthesis, and more). You can also:

- **Add custom queries** via the "+ Add query" button
- **Run all benchmarks** with a single click — each query executes across all active strategies
- **Delete** custom queries you no longer need

### Right panel — Scoring detail

Clicking a query row opens the scoring breakdown:

| Score dimension | What it measures |
|---|---|
| **Relevance** | How closely retrieved chunks match the query intent |
| **Groundedness** | Whether the generated answer is supported by retrieved context |
| **Completeness** | Whether all facets of the question are addressed |
| **Human rating** | 1–5 star override from a human reviewer |

Scores are computed heuristically (no external LLM call needed) and are stored persistently.

### Export

Click **"Export results"** to download a full benchmark report as JSON — suitable for inclusion in IEEE evaluation appendices.

---

## 13. Evidence — Research Assistant

**Sidebar: Evidence → Research Assistant**

The Research Assistant is a **conversational interface** that answers questions about your RAG experiments, methodology, and results — completely rule-based, no external LLM calls required.

### Quick-start suggestions

On first load, suggestion pills offer common prompts:

- _"What was tested?"_ — summarises the strategies and queries run
- _"Compare latency across strategies"_ — returns a table of latency medians per strategy
- _"What is the methodology?"_ — explains the simulation and scoring approach
- _"Generate deep-dive report"_ — produces a structured Markdown summary of all experiment runs

### Ad-hoc questions

Type any free-form question in the chat input. The assistant queries stored `WorkflowRun` data and returns structured answers with tables, metrics, and experiment IDs.

---

## End-to-End Flow Summary

```
Architecture Catalog  (pick a pattern)
  └─ Guided Designer  (step 1: profile → step 2: retrieval → step 3: governance)
       └─ Workflow Builder  (deep-configure each node → Publish)
            └─ Query Lab  (run multi-strategy simulation → inspect evidence cards)
                 ├─ Observability  (monitor runs + audit trail)
                 └─ Evidence
                      ├─ Evaluation Harness  (benchmark scoring, export)
                      └─ Research Assistant  (conversational experiment Q&A)
```

---

*RAG Studio v1.1 · For API reference see [architecture.md](./architecture.md) · Deployed on [ragorchestrationstudio.com](https://ragorchestrationstudio.com)*
