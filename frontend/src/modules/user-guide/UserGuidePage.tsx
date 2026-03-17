import React from 'react'
import './user-guide.css'

/** Images live in frontend/public/guide-images/ → served as static assets by Vite dev
 *  and by Vercel's CDN in production at /guide-images/<filename>
 */
function GuideImg({ src, alt }: { src: string; alt: string }) {
    return (
        <figure className="guide-figure">
            <img src={src} alt={alt} className="guide-screenshot" loading="lazy" />
            <figcaption className="guide-figcaption">{alt}</figcaption>
        </figure>
    )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <div className="guide-step">
            <div className="guide-step-badge">{n}</div>
            <div className="guide-step-body">
                <h4 className="guide-step-title">{title}</h4>
                {children}
            </div>
        </div>
    )
}

function Callout({ children }: { children: React.ReactNode }) {
    return <div className="guide-callout">{children}</div>
}

function KVTable({ rows }: { rows: [string, string][] }) {
    return (
        <table className="guide-table">
            <tbody>
                {rows.map(([a, b]) => (
                    <tr key={a}>
                        <td className="guide-td guide-td-key">{a}</td>
                        <td className="guide-td">{b}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

export function UserGuidePage() {
    return (
        <div className="guide-root">
            {/* Hero */}
            <div className="guide-hero">
                <div className="guide-hero-top">
                    <div>
                        <h1 className="guide-hero-title">RAGOS — User Guide</h1>
                        <p className="guide-hero-sub">RAG Orchestration Studio · v2.4 · March 2026</p>
                        <p className="guide-hero-desc">The enterprise control plane for designing, validating, governing, and operating retrieval-augmented generation architectures.</p>
                    </div>
                    <a
                        href="/user-guide.pdf"
                        download="RAGOS - User Guide v2.4.pdf"
                        className="guide-download-btn"
                        title="Download the User Guide as a PDF"
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" clipRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                        </svg>
                        Download PDF
                    </a>
                </div>
            </div>

            {/* Persona + Edition Overview */}
            <div className="guide-overview-strip">
                <div className="guide-persona-grid">
                    <div className="guide-persona-card">
                        <div className="guide-persona-icon">🏗️</div>
                        <strong>AI Architect</strong>
                        <span>Catalog → Advisor → Designer → Builder → Query Lab</span>
                    </div>
                    <div className="guide-persona-card">
                        <div className="guide-persona-icon">🔬</div>
                        <strong>Knowledge Engineer</strong>
                        <span>Query Lab → Evaluation Harness → Research Assistant</span>
                    </div>
                    <div className="guide-persona-card">
                        <div className="guide-persona-icon">🛡️</div>
                        <strong>Compliance / Auditor</strong>
                        <span>Governance → Observability → Audit Log</span>
                    </div>
                    <div className="guide-persona-card">
                        <div className="guide-persona-icon">📊</div>
                        <strong>Executive Sponsor</strong>
                        <span>Executive Summary → Cost & ROI → Business Case</span>
                    </div>
                    <div className="guide-persona-card">
                        <div className="guide-persona-icon">⚙️</div>
                        <strong>Platform Admin</strong>
                        <span>Admin → Users → Roles → Teams → Sessions → Audit</span>
                    </div>
                </div>
            </div>

            {/* Flow banner */}
            <div className="guide-flow-banner">
                {['Catalog', 'Advisor', 'Designer', 'Builder', 'Query Lab', 'Governance', 'Environments', 'Observability', 'Cost & ROI', 'Exec Summary'].map((step, i, arr) => (
                    <React.Fragment key={step}>
                        <span className="guide-flow-step">{step}</span>
                        {i < arr.length - 1 && <span className="guide-flow-arrow">→</span>}
                    </React.Fragment>
                ))}
            </div>

            {/* Two-column: TOC + article */}
            <div className="guide-layout">
                {/* Sticky table of contents */}
                <nav className="guide-toc">
                    <p className="guide-toc-label">Contents</p>
                    {[
                        ['signing-in', '1 · Signing In'],
                        ['catalog', '2 · Architecture Catalog'],
                        ['advisor', '3 · Architect Advisor'],
                        ['industry-packs', '4 · Industry Packs'],
                        ['designer', '5 · Guided Designer'],
                        ['generate', '6 · Generate Workflow'],
                        ['builder', '7 · Workflow Builder'],
                        ['query-lab', '8 · Query Lab'],
                        ['integrations', '9 · Integrations Studio'],
                        ['environments', '10 · Environments'],
                        ['governance', '11 · Governance'],
                        ['observability', '12 · Observability'],
                        ['cost-roi', '13 · Cost & ROI'],
                        ['executive-summary', '14 · Executive Summary'],
                        ['evaluation', '15 · Evaluation Harness'],
                        ['research', '16 · Research Assistant'],
                        ['admin-users', '17 · Admin — Users'],
                        ['admin-roles', '18 · Admin — Roles & Teams'],
                        ['admin-sessions', '19 · Admin — Sessions & Audit'],
                    ].map(([id, label]) => (
                        <a key={id} href={`#${id}`} className="guide-toc-link">{label}</a>
                    ))}
                </nav>

                {/* Main article */}
                <article className="guide-article">

                    {/* ── 1. Signing In ─────────────────────────────────────── */}
                    <section id="signing-in" className="guide-section">
                        <h2 className="guide-section-title">1 · Signing In</h2>
                        <div className="guide-section-body">
                            <p>Navigate to <strong>ragorchestrationstudio.com</strong> and click <strong>Continue with Google →</strong>. The platform uses Google OAuth 2.0 — you are redirected back immediately after authentication.</p>
                            <KVTable rows={[
                                ['Auto-seed', 'Demo data is loaded automatically on first sign-in (no manual step required)'],
                                ['Welcome toast', '"Welcome back, [Name]! 👋" appears the first time each browser session'],
                                ['Session', 'All queries refresh automatically after sign-in; no manual page reload needed'],
                            ]} />
                            <Callout>All results are simulated until real LLM API keys are connected via <strong>Integrations</strong>. A banner is shown on every page as a reminder.</Callout>
                        </div>
                    </section>

                    {/* ── 2. Architecture Catalog ───────────────────────────── */}
                    <section id="catalog" className="guide-section">
                        <h2 className="guide-section-title">2 · Architecture Catalog</h2>
                        <div className="guide-section-body">
                            <p>The <strong>Architecture Catalog</strong> is your starting point. It presents <strong>18 RAG architecture patterns</strong>, each with description, when-to-use guidance, strengths & tradeoffs, typical backend stacks, and a <strong>Required Integrations Panel</strong> showing live connector health.</p>

                            <h4 className="guide-h4">Core Architectures</h4>
                            <GuideImg src="/guide-images/catalog-row1.png" alt="Architecture Catalog — Vector, Vectorless and Graph RAG with tier badges and commercial strips" />
                            <KVTable rows={[
                                ['Vector RAG', 'Semantic similarity over embedded text corpora — Core tier'],
                                ['Vectorless RAG', 'Structured data, strict precision, no embedding overhead — Core tier'],
                                ['Graph RAG', 'Entity-rich data requiring multi-hop reasoning — Core tier'],
                            ]} />

                            <h4 className="guide-h4">Advanced & Specialized Architectures</h4>
                            <GuideImg src="/guide-images/catalog-row2.png" alt="Architecture Catalog — Temporal, Hybrid and Custom RAG cards with commercial identity" />
                            <KVTable rows={[
                                ['Temporal RAG', 'Time-aware retrieval over event sequences — Advanced tier'],
                                ['Hybrid RAG', 'Combining vector, lexical, and graph strategies — Advanced tier'],
                                ['Custom RAG', 'Bespoke pipelines beyond standard patterns — Advanced tier'],
                                ['Agentic RAG', 'Autonomous agents with dynamic tool calls — Specialized'],
                                ['Modular RAG', 'Swappable microservice modules — Specialized'],
                                ['Memory-Augmented', 'Long-term context and personalized recommendations — Specialized'],
                                ['Multi-Modal', 'Cross-modal retrieval: text, image, audio, video — Specialized'],
                                ['Federated', 'Privacy-preserving retrieval across orgs — Specialized'],
                                ['Streaming', 'Real-time event stream processing — Specialized'],
                                ['Contextual', 'Conversation-aware, session-state retrieval — Specialized'],
                                ['Knowledge-Enhanced', 'Ontology and taxonomy-grounded retrieval — Specialized'],
                                ['Self-RAG', 'Self-reflection with iterative refinement — Specialized'],
                                ['HyDE', 'Hypothetical document embedding for guided retrieval — Specialized'],
                                ['Recursive', 'Multiple rounds of retrieval and generation — Specialized'],
                                ['Domain-Specific', 'Industry-tailored pipelines (legal, medical, financial) — Specialized'],
                            ]} />

                            <h4 className="guide-h4">Commercial Identity on Every Card</h4>
                            <p>Each architecture card now shows:</p>
                            <KVTable rows={[
                                ['Tier badge', '⭐ Core, 🔧 Advanced, or 🔬 Specialized'],
                                ['Business outcome badge', 'e.g. "Best for broad semantic search"'],
                                ['Commercial strip', 'Setup days · cost tier · governance posture'],
                                ['"Why it wins"', 'One-sentence competitive advantage for this architecture'],
                            ]} />

                            <p>Click <strong>"Design this architecture"</strong> on any card to open the Guided Designer pre-configured for that type.</p>
                            <Callout><strong>Toggle views:</strong> Use <strong>Flat Grid</strong> for all 18 at once, or <strong>Tiered View</strong> to see Core → Advanced → Specialized groupings with governance profile overlays.</Callout>
                        </div>
                    </section>

                    {/* ── 3. Architect Advisor ────────────────────────────────── */}
                    <section id="advisor" className="guide-section">
                        <h2 className="guide-section-title">3 · Architect Advisor</h2>
                        <div className="guide-section-body">
                            <p>The <strong>Architect Advisor</strong> is an <strong>8-question decision wizard</strong> that recommends the most appropriate RAG architecture — or suggests Long Context Window / Fine-tuning when RAG is not the right tool.</p>

                            <h4 className="guide-h4">Questions Asked</h4>
                            <KVTable rows={[
                                ['1. Business use-case', '8 categories: Compliance Q&A, Customer Support, Code Search, etc.'],
                                ['2. Data modality', 'Structured, unstructured, mixed, time-series'],
                                ['3. Volume', '< 10k, 10k–1M, > 1M documents'],
                                ['4. Freshness requirement', 'Real-time, daily, static'],
                                ['5. Governance sensitivity', 'Standard, regulated/HIPAA/FINRA, safety-critical'],
                                ['6. Budget posture', 'Tight (minimize cost), moderate (balance), flexible (invest for quality)'],
                                ['7. Latency tolerance', 'Under 500ms, under 2s, flexible/batch OK'],
                                ['8. Explainability', 'Required (audit/compliance), nice to have, not needed'],
                            ]} />

                            <h4 className="guide-h4">What You Get</h4>
                            <KVTable rows={[
                                ['Recommended architecture', 'Best-fit architecture type based on your answers'],
                                ['Operational profile', 'Complexity badge, setup days, cost tier, stack readiness'],
                                ['Required integrations', 'Live health status of each required connector'],
                                ['Commercial Profile', '⏱ Setup effort · 💰 Cost posture · 🏛️ Governance · 📈 ROI lever'],
                                ['"Why Not the Alternatives?"', 'Explains why each rejected architecture was ruled out'],
                            ]} />
                            <p>Click <strong>"Design this →"</strong> to jump directly to the Guided Designer for the recommended type.</p>
                        </div>
                    </section>

                    {/* ── 4. Industry Packs ────────────────────────────────────── */}
                    <section id="industry-packs" className="guide-section">
                        <h2 className="guide-section-title">4 · Industry Solution Packs</h2>
                        <div className="guide-section-body">
                            <p>Pre-packaged RAG configurations for six enterprise verticals — each contains reference integrations, governance policies, benchmark suites, and estimated setup time.</p>
                            <KVTable rows={[
                                ['Financial Services', 'Compliance & Risk Q&A — Vector, Temporal — 7 days — GA'],
                                ['Healthcare', 'Clinical Knowledge Assistant — Graph, Hybrid — 10 days — GA'],
                                ['Legal', 'Contract Intelligence Suite — Vectorless, Temporal — 5 days — GA'],
                                ['Retail', 'Product & Support Intelligence — Vector, Hybrid — 3 days — GA'],
                                ['Manufacturing', 'Technical Documentation — Vector, Graph — 6 days — Beta'],
                                ['Government', 'Civic Knowledge Engine — Vectorless, Temporal — 8 days — Preview'],
                            ]} />
                            <p>Click <strong>"Launch Guided Designer →"</strong> on any pack to pre-load the designer with the pack's primary architecture.</p>
                        </div>
                    </section>

                    {/* ── 5. Guided Designer ───────────────────────────────────── */}
                    <section id="designer" className="guide-section">
                        <h2 className="guide-section-title">5 · Guided Designer — Configure Your Pipeline</h2>
                        <div className="guide-section-body">
                            <p>After clicking "Design this architecture", the Guided Designer opens with a <strong>3-step wizard</strong>. All configuration fields are visible across three columns.</p>

                            <Step n={1} title="Architecture Profile">
                                <KVTable rows={[
                                    ['Data source type', 'File store, SQL, data warehouse, etc.'],
                                    ['Chunking strategy', 'Semantic, fixed-size, recursive, sliding-window'],
                                    ['Embedding model', 'e.g. text-embedding-3-large, BGE, E5'],
                                    ['Vector database', 'pgvector, Pinecone, Weaviate, Qdrant'],
                                ]} />
                            </Step>

                            <Step n={2} title="Retrieval & Routing">
                                <KVTable rows={[
                                    ['Similarity metric', 'Cosine, dot product, or L2'],
                                    ['Top K', 'Number of chunks to retrieve (default 8)'],
                                    ['Metadata filters', 'DSL expressions to narrow the result set'],
                                    ['Reranker', 'Optional cross-encoder or SaaS reranker'],
                                ]} />
                            </Step>

                            <Step n={3} title="Answering & Governance">
                                <KVTable rows={[
                                    ['Answer generation model', 'The LLM used for final answer synthesis'],
                                    ['Fallback strategy', 'llm_fallback, no_answer, or custom'],
                                ]} />
                            </Step>
                        </div>
                    </section>

                    {/* ── 6. Generate Workflow ──────────────────────────────── */}
                    <section id="generate" className="guide-section">
                        <h2 className="guide-section-title">6 · Generate Workflow</h2>
                        <div className="guide-section-body">
                            <p>Click <strong>"Generate workflow →"</strong> at the bottom-right. The designer compiles your configuration into a <strong>WorkflowDefinition</strong> graph (a real database record) and redirects you to the Workflow Builder.</p>
                            <Callout><strong>Tip:</strong> Click <em>"Save draft"</em> at any time to persist the designer session without generating a workflow yet. All 18 architecture types have unique node graph mappings.</Callout>
                        </div>
                    </section>

                    {/* ── 7. Workflow Builder ──────────────────────────────── */}
                    <section id="builder" className="guide-section">
                        <h2 className="guide-section-title">7 · Workflow Builder</h2>
                        <div className="guide-section-body">
                            <p>Visualises your RAG pipeline as a <strong>node-based directed graph</strong>. Each node is a processing step; edges represent data flow.</p>
                            <GuideImg src="/guide-images/workflow-builder.png" alt="Workflow Builder — visual node graph with deep configuration panel" />
                            <KVTable rows={[
                                ['Left — Node Palette', 'Drag-and-drop by category: Input & Routing, Retrieval, Processing, Generation'],
                                ['Centre — Canvas', 'Live pipeline graph with zoom (+/−) and fit-to-window'],
                                ['Right — Deep Config', 'Click any node: chunking strategy, embedding model, ANN algorithm, BM25 tuning, graph traversal, LLM params, guardrail checks'],
                            ]} />

                            <h4 className="guide-h4">Governance-Gated Publishing</h4>
                            <p>The <strong>Publish</strong> button requires the <code>publish_workflows</code> permission (AI Architect or Platform Admin). On click, the governance gate runs all active policies, checks confidence scores and minimum run thresholds. If blocked, a violation list explains what must improve. Rate limit: <strong>10 per user per minute</strong>.</p>
                        </div>
                    </section>

                    {/* ── 8. Query Lab ─────────────────────────────────────── */}
                    <section id="query-lab" className="guide-section">
                        <h2 className="guide-section-title">8 · Query Lab</h2>
                        <div className="guide-section-body">
                            <p>Test workflows interactively and compare up to <strong>5 retrieval strategies</strong> side by side.</p>
                            <GuideImg src="/guide-images/query-lab.png" alt="Query Lab — multi-strategy simulation with evidence cards" />
                            <KVTable rows={[
                                ['Workflow', 'Select from all draft/published workflows'],
                                ['Environment', 'Target: dev, staging, prod'],
                                ['Query text', 'Your test question or instruction'],
                                ['Strategies', 'Vector, Vectorless, Graph, Temporal, Hybrid — pick any combination'],
                                ['Top-k', 'Retrieval hint — number of chunks returned'],
                            ]} />

                            <h4 className="guide-h4">Results Cards</h4>
                            <KVTable rows={[
                                ['Experiment ID', 'Citeable exp-XXXXXX identifier'],
                                ['Latency bar', 'Visual benchmark across all strategies'],
                                ['Retrieved chunks', 'Top-scored chunks with source attribution'],
                                ['Retrieval path', 'Pipeline nodes traversed'],
                                ['Answer', 'Generated response text'],
                                ['Export', 'Download as JSON for IEEE evidence appendices'],
                            ]} />

                            <h4 className="guide-h4">Run History</h4>
                            <p>Searchable, exportable history of all simulation runs with <strong>5-second auto-poll</strong> for live status updates.</p>
                        </div>
                    </section>

                    {/* ── 9. Integrations Studio ───────────────────────────── */}
                    <section id="integrations" className="guide-section">
                        <h2 className="guide-section-title">9 · Integrations Studio</h2>
                        <div className="guide-section-body">
                            <GuideImg src="/guide-images/integrations.png" alt="Integrations Studio — connector health, stack validation, connector packs" />
                            <p>Centralize model, database, and storage connections with 5 tabs:</p>
                            <KVTable rows={[
                                ['📋 Catalog', 'All available connectors with live health indicators (🟢 healthy / 🔴 error / ⚪ unknown)'],
                                ['🔌 Active', 'Currently configured integrations with connection status'],
                                ['🔗 Binding Matrix', 'Which integrations are bound to which environments'],
                                ['🔍 Stack Validation', 'Per-architecture required stack check — shows missing connectors for each arch type'],
                                ['📦 Connector Packs', 'Pre-bundled connector sets by category (LLM Suite, Vector Suite, Observability Suite)'],
                            ]} />
                            <KVTable rows={[
                                ['LLM providers', 'OpenAI, Anthropic, Cohere, local models'],
                                ['Vector stores', 'pgvector, Pinecone, Weaviate, Qdrant'],
                                ['Document sources', 'S3, GCS, SharePoint, SQL databases'],
                                ['Graph databases', 'Neo4j, Amazon Neptune, ArangoDB'],
                            ]} />
                        </div>
                    </section>

                    {/* ── 10. Environments ─────────────────────────────────── */}
                    <section id="environments" className="guide-section">
                        <h2 className="guide-section-title">10 · Environments & Promotion Pipeline</h2>
                        <div className="guide-section-body">
                            <GuideImg src="/guide-images/environments.png" alt="Environments — deployment readiness scorecard with promotion pipeline" />
                            <p>Environments are deployment targets, each with its own integration bindings and configuration overrides.</p>
                            <KVTable rows={[
                                ['dev', 'Local/sandbox testing, simulated execution'],
                                ['staging', 'Pre-production validation with real LLMs'],
                                ['prod', 'Live deployment serving end-user queries'],
                            ]} />

                            <h4 className="guide-h4">5-Point Deployment Readiness Scorecard</h4>
                            <KVTable rows={[
                                ['1. Integrations bound', 'How many required connectors are linked to this env'],
                                ['2. Stack validated', 'Required architecture stack components confirmed'],
                                ['3. Governance approval', 'All applicable policies pass'],
                                ['4. Cost profile available', 'Cost estimation data exists for this architecture'],
                                ['5. Promoted to production', 'Final deployment status'],
                            ]} />

                            <h4 className="guide-h4">Promotion Pipeline</h4>
                            <p>Environments advance through <strong>draft → pending → promoted</strong>. The final step is <strong>governance-gated</strong> (RBAC + policy check + rate limit: 5/min). Contextual blocker messages explain what's missing.</p>
                        </div>
                    </section>

                    {/* ── 11. Governance ───────────────────────────────────── */}
                    <section id="governance" className="guide-section">
                        <h2 className="guide-section-title">11 · Governance & Guardrails</h2>
                        <div className="guide-section-body">
                            <GuideImg src="/guide-images/governance.png" alt="Governance — policies, approval rules, and bindings" />
                            <p>Define and enforce policies across the platform lifecycle. Governance is <strong>enforced at publish and promote time</strong> — not just advisory.</p>
                            <KVTable rows={[
                                ['Policies', 'Rules with scope (workflow / environment / architecture) and parameters (min_confidence_score, min_runs)'],
                                ['Approval Rules', 'Role-based human sign-off routing for additional oversight'],
                                ['Bindings', 'Associate policies with specific workflows, environments, or architecture types'],
                            ]} />
                            <Callout>All governance events (blocked, approved, bypassed) are written to the <strong>Audit Log</strong> automatically.</Callout>
                        </div>
                    </section>

                    {/* ── 12. Observability ────────────────────────────────── */}
                    <section id="observability" className="guide-section">
                        <h2 className="guide-section-title">12 · Observability & Traces</h2>
                        <div className="guide-section-body">
                            <GuideImg src="/guide-images/observability.png" alt="Observability — 7-tab operational command centre with AI Recommendations" />
                            <p>Operational command centre with <strong>7 tabs</strong>:</p>

                            <KVTable rows={[
                                ['⚡ Operations', 'Total runs, success rate, failed, simulated, integration health ratio'],
                                ['🎯 Retrieval Quality', 'Live Evaluation Harness data: avg relevance %, groundedness %, top strategy'],
                                ['🛡️ Governance Risk', 'Audit-log-powered violations table with 7d KPI'],
                                ['💰 Cost Analytics', 'Per-architecture cost breakdown with cost tier mapping'],
                                ['📜 Run History', 'Filterable table; click any row for Trace Explorer (per-node latency bars)'],
                                ['🔍 Audit Log', 'Global governance events across the platform'],
                                ['🤖 AI Recommendations', 'Prescriptive actionable recommendations — see below'],
                            ]} />

                            <h4 className="guide-h4">🤖 AI Recommendations (Sprint 6)</h4>
                            <p>The AI Recommendations tab now includes:</p>
                            <KVTable rows={[
                                ['Operating metrics row', 'Cost/run · Quality compliance % · Critical issues · Total recommendations'],
                                ['Priority badges', 'Critical / high / medium / low severity classification'],
                                ['"Fix this →" buttons', 'Navigate directly to the relevant page (Integrations, Governance, Cost & ROI, etc.)'],
                                ['"Why?" toggles', 'Expandable root-cause explanations for each recommendation'],
                            ]} />
                        </div>
                    </section>

                    {/* ── 13. Cost & ROI ───────────────────────────────────── */}
                    <section id="cost-roi" className="guide-section">
                        <h2 className="guide-section-title">13 · Cost & ROI Analytics</h2>
                        <div className="guide-section-body">
                            <p>Full-featured cost analysis and ROI modelling with <strong>4 tabs</strong>:</p>
                            <KVTable rows={[
                                ['🧮 Calculator', '3-layer economics: Engineering (cost/1k queries, latency, tokens) → Business Impact (time saved, ticket deflection) → Executive (savings, payback, recommendation)'],
                                ['📊 TCO Comparator', 'Side-by-side Total Cost of Ownership across all 18 architectures'],
                                ['🏢 Use-Case Templates', 'Pre-built ROI models: Support Assistant, Compliance Q&A, Incident Investigation, Contract Intelligence'],
                                ['🌡️ Env Heatmap', 'Cost distribution across dev / staging / prod with cost tier labels'],
                            ]} />
                        </div>
                    </section>

                    {/* ── 14. Executive Summary ────────────────────────────── */}
                    <section id="executive-summary" className="guide-section">
                        <h2 className="guide-section-title">14 · Executive Summary</h2>
                        <div className="guide-section-body">
                            <p>Platform intelligence dashboard with <strong>4 tabs</strong>:</p>

                            <h4 className="guide-h4">Platform Headline Banner</h4>
                            <p>A state-derived banner at the top shows platform health status (✅ healthy / ⚠️ blocked / 💡 ready to start), best-fit architecture chip, and a top action CTA.</p>

                            <KVTable rows={[
                                ['📊 Overview', 'Live KPIs: total runs, success rate, cost, latency, active architectures & environments'],
                                ['🎯 Action Board', 'Prioritised "what to do next" actions with click-to-navigate links'],
                                ['💰 ROI Summary', 'Cross-architecture ROI comparison: monthly cost, value, net savings, latency'],
                                ['📋 Business Case', '3-variant generator: 💼 Executive, ⚙️ Technical, 🛡️ Governance — each with variant-specific framing'],
                            ]} />
                        </div>
                    </section>

                    {/* ── 15. Evaluation Harness ───────────────────────────── */}
                    <section id="evaluation" className="guide-section">
                        <h2 className="guide-section-title">15 · Evaluation Harness</h2>
                        <div className="guide-section-body">
                            <p>IEEE-citeable evidence layer for quality assurance:</p>
                            <KVTable rows={[
                                ['Benchmark queries', '6 pre-seeded canonical enterprise test cases'],
                                ['Heuristic scoring', 'Relevance, groundedness, completeness scores per query per strategy'],
                                ['Human ratings', '1–5 override rating on any benchmark result'],
                                ['Export', 'JSON export for audit evidence and IEEE appendices'],
                                ['Aggregated scores', 'Feeds Observability Retrieval Quality tab + Executive Summary Overview'],
                            ]} />
                        </div>
                    </section>

                    {/* ── 16. Research Assistant ───────────────────────────── */}
                    <section id="research" className="guide-section">
                        <h2 className="guide-section-title">16 · Research Assistant</h2>
                        <div className="guide-section-body">
                            <p>Rule-based conversational interface for querying stored <strong>WorkflowRun</strong> data. No external LLM dependency.</p>
                            <KVTable rows={[
                                ['Suggestion pills', 'Summarise, compare latency, methodology, deep-dive report'],
                                ['Free-form queries', 'Ask any question about run data, performance, or patterns'],
                                ['Source attribution', 'All answers cite stored run records'],
                            ]} />
                        </div>
                    </section>

                    {/* ── 17. Admin — Users ────────────────────────────────── */}
                    <section id="admin-users" className="guide-section">
                        <h2 className="guide-section-title">17 · Admin — Users</h2>
                        <div className="guide-section-body">
                            <GuideImg src="/guide-images/admin-users.png" alt="Admin Users — split-panel layout with sessions and audit drill-down" />
                            <p><em>Requires <code>administer_platform</code> permission.</em></p>
                            <p><strong>Two-panel split layout:</strong> user list on the left, detail panel on the right with Sessions tab + Audit Log tab.</p>
                            <KVTable rows={[
                                ['View', 'All users with role, team, status, last activity'],
                                ['Edit', 'Change role or team via dropdowns'],
                                ['Deactivate', 'Remove access (not available on own account)'],
                            ]} />
                        </div>
                    </section>

                    {/* ── 18. Admin — Roles & Teams ────────────────────────── */}
                    <section id="admin-roles" className="guide-section">
                        <h2 className="guide-section-title">18 · Admin — Roles & Teams</h2>
                        <div className="guide-section-body">
                            <h4 className="guide-h4">Roles (RBAC)</h4>
                            <KVTable rows={[
                                ['Platform Admin', 'All permissions including administer_platform, approve_promotions'],
                                ['AI Architect', 'design_architecture, publish_workflows, manage_integrations, manage_environments'],
                                ['Knowledge Engineer', 'design_architecture, run_evaluations'],
                                ['Auditor', 'view_observability (read-only)'],
                                ['Viewer', 'view_observability (read-only)'],
                            ]} />
                            <h4 className="guide-h4">Teams</h4>
                            <p>Group users into teams: Platform Engineering, AI/ML, Data Engineering, Compliance & Audit. Teams scope workflow ownership and governance approval routing.</p>
                        </div>
                    </section>

                    {/* ── 19. Admin — Sessions & Audit ─────────────────────── */}
                    <section id="admin-sessions" className="guide-section">
                        <h2 className="guide-section-title">19 · Admin — Sessions & Audit Trail</h2>
                        <div className="guide-section-body">
                            <p>Click any user row in Admin → Users to open the detail panel.</p>
                            <h4 className="guide-h4">🔑 Sessions Tab</h4>
                            <KVTable rows={[
                                ['Status', '🟢 Active (glowing) or ⛔ Revoked'],
                                ['Started', 'Time since session creation'],
                                ['Last seen', 'Time since last activity'],
                                ['IP address', 'Source IP'],
                                ['Actions', 'Revoke individual session or "⛔ Revoke all sessions"'],
                            ]} />
                            <h4 className="guide-h4">📋 Audit Log Tab</h4>
                            <p>50 most recent audit events for the selected user: timestamp, action (e.g. workflow.published, environment.promoted), resource type & ID, IP, expandable event_data JSON.</p>
                            <Callout>Audit events are written automatically on every governance-sensitive action. They cannot be edited or deleted.</Callout>
                        </div>
                    </section>

                </article>
            </div>
        </div>
    )
}
