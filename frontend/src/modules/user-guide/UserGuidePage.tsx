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
                        <h1 className="guide-hero-title">User Guide</h1>
                        <p className="guide-hero-sub">RAG Orchestration Studio · v1.0</p>
                    </div>
                    <a
                        href="/user-guide.pdf"
                        download="RAG Orchestration Studio - User Guide.pdf"
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

            {/* Flow banner */}
            <div className="guide-flow-banner">
                {['Architecture Catalog', 'Guided Designer', 'Generate Workflow', 'Workflow Builder', 'Query Lab', 'Observability'].map((step, i, arr) => (
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
                        ['designer', '3 · Guided Designer'],
                        ['generate', '4 · Generate Workflow'],
                        ['builder', '5 · Workflow Builder'],
                        ['query-lab', '6 · Query Lab'],
                        ['integrations', '7 · Integrations'],
                        ['environments', '8 · Environments'],
                        ['governance', '9 · Governance'],
                        ['observability', '10 · Observability'],
                        ['admin', '11 · Admin'],
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
                            <p>Navigate to <strong>ragorchestrationstudio.com</strong> and click <strong>Continue with Google</strong>. The platform uses Google OAuth — you will be redirected back immediately after authentication.</p>
                            <Callout>All results are simulated until real LLM API keys are connected via <strong>Integrations</strong>. A banner is shown on every page as a reminder.</Callout>
                        </div>
                    </section>

                    {/* ── 2. Architecture Catalog ───────────────────────────── */}
                    <section id="catalog" className="guide-section">
                        <h2 className="guide-section-title">2 · Architecture Catalog</h2>
                        <div className="guide-section-body">
                            <p>The <strong>Architecture Catalog</strong> is your starting point. It presents six RAG architecture patterns, each with a description, when-to-use guidance, strengths &amp; tradeoffs, and typical backend stacks.</p>

                            <h4 className="guide-h4">Row 1 — Core architectures</h4>
                            <GuideImg src="/guide-images/catalog-row1.png" alt="Architecture Catalog — Vector, Vectorless and Graph RAG cards" />
                            <KVTable rows={[
                                ['Vector RAG', 'Semantic similarity over embedded text corpora'],
                                ['Vectorless RAG', 'Structured data, strict precision, no embedding overhead'],
                                ['Graph RAG', 'Entity-rich data requiring multi-hop reasoning'],
                            ]} />

                            <h4 className="guide-h4">Row 2 — Advanced architectures</h4>
                            <GuideImg src="/guide-images/catalog-row2.png" alt="Architecture Catalog — Temporal, Hybrid and Custom RAG cards" />
                            <KVTable rows={[
                                ['Temporal RAG', 'Time-aware retrieval over event sequences'],
                                ['Hybrid RAG', 'Combining vector, lexical, and graph strategies'],
                                ['Custom RAG', 'Bespoke pipelines beyond standard patterns'],
                            ]} />

                            <p>Click <strong>"Design this architecture"</strong> on any card to open the Guided Designer pre-configured for that type.</p>
                        </div>
                    </section>

                    {/* ── 3. Guided Designer — Configure ───────────────────── */}
                    <section id="designer" className="guide-section">
                        <h2 className="guide-section-title">3 · Guided Designer — Configure</h2>
                        <div className="guide-section-body">
                            <p>After clicking "Design this architecture", the Guided Designer opens. The left panel shows a 3-step navigation; all configuration fields are visible across three columns simultaneously.</p>

                            <Step n={1} title="Architecture profile">
                                <GuideImg src="/guide-images/designer-step1.png" alt="Guided Designer — Step 1: Architecture profile" />
                                <KVTable rows={[
                                    ['Data source type', 'File store, SQL, data warehouse…'],
                                    ['Chunking strategy', 'semantic, fixed-size, sentence…'],
                                    ['Embedding model', 'e.g. text-embedding-3-large'],
                                    ['Vector database', 'pgvector, Pinecone, Weaviate, Qdrant'],
                                ]} />
                            </Step>

                            <Step n={2} title="Retrieval & routing">
                                <GuideImg src="/guide-images/designer-step2.png" alt="Guided Designer — Step 2: Retrieval & routing" />
                                <KVTable rows={[
                                    ['Similarity metric', 'cosine, dot product, or L2'],
                                    ['Top K', 'Number of chunks to retrieve (default 8)'],
                                    ['Metadata filters', 'DSL expressions to narrow the result set'],
                                    ['Reranker', 'Optional cross-encoder or SaaS reranker'],
                                ]} />
                            </Step>

                            <Step n={3} title="Answering & governance">
                                <GuideImg src="/guide-images/designer-step3.png" alt="Guided Designer — Step 3: Answering & governance with Generate workflow button" />
                                <KVTable rows={[
                                    ['Answer generation model', 'The LLM used for final answer synthesis'],
                                    ['Fallback strategy', 'llm_fallback, no_answer, or custom'],
                                ]} />
                            </Step>
                        </div>
                    </section>

                    {/* ── 4. Generate Workflow ──────────────────────────────── */}
                    <section id="generate" className="guide-section">
                        <h2 className="guide-section-title">4 · Guided Designer — Generate Workflow</h2>
                        <div className="guide-section-body">
                            <p>Once all three steps are reviewed, click <strong>"Generate workflow →"</strong> at the bottom-right of the designer.</p>
                            <GuideImg src="/guide-images/designer-generate.png" alt="Generate workflow — button transitions to Generating workflow… while processing" />
                            <p>After generation completes you are automatically redirected to the <strong>Workflow Builder</strong> with the pipeline ready to inspect.</p>
                            <Callout><strong>Tip:</strong> Click <em>"Save draft"</em> to persist the designer session without generating a workflow yet.</Callout>
                        </div>
                    </section>

                    {/* ── 5. Workflow Builder ───────────────────────────────── */}
                    <section id="builder" className="guide-section">
                        <h2 className="guide-section-title">5 · Workflow Builder</h2>
                        <div className="guide-section-body">
                            <p>The Workflow Builder visualises your RAG pipeline as a <strong>node-based directed graph</strong>. Each node is a processing step; edges represent data flow.</p>
                            <GuideImg src="/guide-images/workflow-builder.png" alt="Workflow Builder — generated Vector RAG node graph" />
                            <KVTable rows={[
                                ['Left — Nodes palette', 'Drag-and-drop nodes by category: Input & Routing, Retrieval, Processing, Generation'],
                                ['Centre — Canvas', 'Live pipeline graph. Zoom with +/−, fit-to-window via the fullscreen icon'],
                                ['Right — Configuration', 'Click any canvas node to inspect and edit its settings'],
                            ]} />
                            <KVTable rows={[
                                ['Save Draft', 'Persist current state without publishing'],
                                ['Publish', 'Mark the workflow active and available in Query Lab'],
                            ]} />
                            <p>Workflows generated from the Designer are pre-labelled with the session number and architecture type, e.g. <em>"Vector RAG — Session #5"</em>.</p>
                        </div>
                    </section>

                    {/* ── 6. Query Lab ─────────────────────────────────────── */}
                    <section id="query-lab" className="guide-section">
                        <h2 className="guide-section-title">6 · Query Lab</h2>
                        <div className="guide-section-body">
                            <p>Test your workflows interactively. After generation, the workflow appears automatically in the <strong>Workflow</strong> dropdown.</p>
                            <GuideImg src="/guide-images/query-lab.png" alt="Query Lab — workflow auto-loaded and ready to run" />
                            <KVTable rows={[
                                ['Workflow', 'Select from all draft / published workflows'],
                                ['Environment', 'Target environment: dev, staging, prod'],
                                ['Query text', 'Your test question or instruction'],
                                ['Strategies to compare', 'Tick any combination: Vector, Vectorless, Graph, Temporal, Hybrid'],
                                ['Top-k', 'Retrieval hint — number of chunks returned'],
                            ]} />
                            <p>Click <strong>"Run simulation"</strong> to execute. Results show per-strategy latency, retrieved chunks, and the generated answer side-by-side.</p>
                            <Callout><em>"Backend returns simulated traces"</em> appears when no real API keys are configured. Connect an LLM in <strong>Integrations</strong> to enable live execution.</Callout>
                        </div>
                    </section>

                    {/* ── 7. Integrations ───────────────────────────────────── */}
                    <section id="integrations" className="guide-section">
                        <h2 className="guide-section-title">7 · Integrations</h2>
                        <div className="guide-section-body">
                            <GuideImg src="/guide-images/integrations.png" alt="Integrations page" />
                            <p>Manage connectors to LLM providers, vector stores, and document sources. Once configured with API keys, Query Lab switches from simulated to live execution.</p>
                            <KVTable rows={[
                                ['LLM providers', 'OpenAI, Anthropic, Cohere, local models'],
                                ['Vector stores', 'pgvector, Pinecone, Weaviate, Qdrant'],
                                ['Document sources', 'S3, GCS, SharePoint, SQL databases'],
                                ['Graph databases', 'Neo4j, Amazon Neptune, ArangoDB'],
                            ]} />
                        </div>
                    </section>

                    {/* ── 8. Environments ───────────────────────────────────── */}
                    <section id="environments" className="guide-section">
                        <h2 className="guide-section-title">8 · Environments</h2>
                        <div className="guide-section-body">
                            <GuideImg src="/guide-images/environments.png" alt="Environments page" />
                            <p>Environments are deployment targets for your workflows, each with its own integration bindings and configuration overrides.</p>
                            <KVTable rows={[
                                ['dev', 'Local / sandbox testing, simulated execution'],
                                ['staging', 'Pre-production validation with real LLMs'],
                                ['prod', 'Live deployment serving end-user queries'],
                            ]} />
                            <p>Promote workflows dev → staging → prod. Promotion triggers any approval gates defined in Governance.</p>
                        </div>
                    </section>

                    {/* ── 9. Governance ─────────────────────────────────────── */}
                    <section id="governance" className="guide-section">
                        <h2 className="guide-section-title">9 · Governance &amp; Guardrails</h2>
                        <div className="guide-section-body">
                            <GuideImg src="/guide-images/governance.png" alt="Governance & Guardrails page" />
                            <p>Define and enforce policies across the platform lifecycle.</p>
                            <KVTable rows={[
                                ['workflow', 'Require approvals before publishing'],
                                ['environment', 'Block promotion if evaluation score < threshold'],
                                ['architecture', 'Whitelist permitted architecture types'],
                            ]} />
                        </div>
                    </section>

                    {/* ── 10. Observability ─────────────────────────────────── */}
                    <section id="observability" className="guide-section">
                        <h2 className="guide-section-title">10 · Observability &amp; Traces</h2>
                        <div className="guide-section-body">
                            <GuideImg src="/guide-images/observability.png" alt="Observability & Trace Analytics page" />
                            <KVTable rows={[
                                ['Run history', 'Timestamped log of every execution with status'],
                                ['Trace analytics', 'Per-node latency breakdown for any selected run'],
                                ['Audit trail', 'Who published, promoted, or modified which workflow'],
                            ]} />
                        </div>
                    </section>

                    {/* ── 11. Admin ─────────────────────────────────────────── */}
                    <section id="admin" className="guide-section">
                        <h2 className="guide-section-title">11 · Admin — Users, Roles &amp; Teams</h2>
                        <div className="guide-section-body">
                            <GuideImg src="/guide-images/admin-users.png" alt="Admin Users page" />
                            <p><strong>Users</strong> — view all platform users, their roles, and last login. Invite by email; sign-in via Google OAuth.</p>
                            <p><strong>Roles</strong> — RAG Studio uses RBAC:</p>
                            <KVTable rows={[
                                ['Platform Admin', 'Full access including admin and governance'],
                                ['AI Architect', 'Create / edit workflows, publish, manage integrations'],
                                ['ML Engineer', 'Edit workflows and run Query Lab'],
                                ['Viewer', 'Read-only across all modules'],
                            ]} />
                            <p><strong>Teams</strong> — group users to scope workflow ownership and governance approval routing.</p>
                        </div>
                    </section>

                </article>
            </div>
        </div>
    )
}
