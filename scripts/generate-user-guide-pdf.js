#!/usr/bin/env node
/**
 * generate-user-guide-pdf.js
 * Renders the RAG Orchestration Studio user guide as a polished PDF.
 * Uses puppeteer-core + @sparticuz/chromium (downloads a local chromium binary).
 *
 * Run:  node scripts/generate-user-guide-pdf.js
 * Output: frontend/public/user-guide.pdf
 */

const path = require('path')
const fs = require('fs')

// ── Image map: section → local absolute path ──────────────────────────────
const BRAIN = '/Users/kinshukdutta/.gemini/antigravity/brain/0ff180c0-debb-4a64-a13c-d77151a12a27'
const IMG = path.resolve(__dirname, '../frontend/public/guide-images')

function imgSrc(filename) {
  // read from public/guide-images which already has the copies
  const p = path.join(IMG, filename)
  if (!fs.existsSync(p)) return ''
  return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64')
}

// ── Build HTML ─────────────────────────────────────────────────────────────
const html = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>RAG Orchestration Studio — User Guide</title>
<style>
  /* ── Reset & base ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
    @top-center { content: "RAG Orchestration Studio — User Guide"; font-size: 8pt; color: #888; }
    @bottom-right { content: counter(page); font-size: 8pt; color: #888; }
  }

  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 10.5pt;
    line-height: 1.65;
    color: #1a1a2e;
    background: #fff;
  }

  /* ── Cover / title ── */
  .cover {
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100vh;
    page-break-after: always;
    text-align: center;
    background: linear-gradient(160deg, #1e1e3f 0%, #0f0f1f 100%);
    color: #fff;
    padding: 4rem 3rem;
  }
  .cover-product { font-size: 11pt; letter-spacing: 0.15em; text-transform: uppercase; color: #a0a8ff; margin-bottom: 1.5rem; }
  .cover-title { font-size: 36pt; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
  .cover-sub { font-size: 14pt; color: #c0c4ff; margin-bottom: 3rem; }
  .cover-badge {
    display: inline-block;
    background: rgba(99,102,241,0.25);
    border: 1px solid rgba(99,102,241,0.5);
    border-radius: 999px;
    padding: 0.3rem 1.2rem;
    font-size: 9.5pt;
    color: #c0c4ff;
    letter-spacing: 0.08em;
  }
  .cover-url { margin-top: 2.5rem; font-size: 9pt; color: #888aaa; }

  /* ── TOC ── */
  .toc { page-break-after: always; padding: 1rem 0; }
  .toc h2 { font-size: 18pt; font-weight: 700; color: #1a1a2e; margin-bottom: 1.5rem; border-bottom: 2px solid #4f46e5; padding-bottom: 0.5rem; }
  .toc ol { padding-left: 1.5rem; }
  .toc li { margin: 0.45rem 0; font-size: 10.5pt; color: #374151; }
  .toc li a { color: #4f46e5; text-decoration: none; }

  /* ── Flow banner ── */
  .flow-banner {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.3rem;
    background: #f0f0ff;
    border-left: 4px solid #4f46e5;
    border-radius: 0 6px 6px 0;
    padding: 0.7rem 1rem;
    margin-bottom: 2rem;
    font-size: 9.5pt;
    font-weight: 500;
    color: #374151;
    page-break-inside: avoid;
  }
  .flow-arrow { color: #4f46e5; font-weight: 700; }

  /* ── Sections ── */
  section { margin-bottom: 2.5rem; page-break-inside: avoid; }
  section h2 {
    font-size: 15pt;
    font-weight: 700;
    color: #1a1a2e;
    margin-bottom: 0.75rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid #e5e7eb;
  }
  section h3 {
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #6366f1;
    margin: 1.2rem 0 0.5rem;
  }
  section p { margin-bottom: 0.6rem; color: #374151; }
  section p strong { color: #1a1a2e; }

  /* ── Screenshots ── */
  figure {
    margin: 0.8rem 0 1rem;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  figure img {
    width: 100%;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    display: block;
  }
  figcaption {
    font-size: 8pt;
    color: #9ca3af;
    text-align: center;
    margin-top: 0.35rem;
    font-style: italic;
  }

  /* ── Step badges ── */
  .step { display: flex; gap: 0.75rem; align-items: flex-start; margin: 1rem 0; }
  .step-badge {
    width: 22px; height: 22px;
    border-radius: 50%;
    background: #4f46e5;
    color: #fff;
    font-size: 8.5pt;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 3px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .step-body { flex: 1; }
  .step-title { font-size: 10.5pt; font-weight: 700; color: #1a1a2e; margin-bottom: 0.35rem; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; margin: 0.6rem 0 1rem; font-size: 9.5pt; }
  th { background: #f3f4f6; color: #374151; font-weight: 600; text-align: left; padding: 0.45rem 0.7rem; border: 1px solid #e5e7eb; }
  td { padding: 0.4rem 0.7rem; border: 1px solid #e5e7eb; color: #374151; vertical-align: top; line-height: 1.5; }
  td:first-child { font-weight: 600; color: #1a1a2e; white-space: nowrap; }
  tr:nth-child(even) td { background: #fafafa; }

  /* ── Callout ── */
  .callout {
    background: #eef2ff;
    border-left: 4px solid #4f46e5;
    border-radius: 0 6px 6px 0;
    padding: 0.6rem 0.9rem;
    font-size: 9.5pt;
    color: #374151;
    margin: 0.7rem 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Code ── */
  pre {
    background: #1e1e3f;
    color: #c0c4ff;
    padding: 0.9rem 1rem;
    border-radius: 6px;
    font-size: 8.5pt;
    font-family: 'Courier New', monospace;
    line-height: 1.55;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── End flow box ── */
  .footer-note { font-size: 8.5pt; color: #9ca3af; text-align: center; margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
</style>
</head>
<body>

<!-- ── COVER ─────────────────────────────────────────────────────────── -->
<div class="cover">
  <p class="cover-product">Product Documentation</p>
  <p class="cover-title">User Guide</p>
  <p class="cover-sub">RAG Orchestration Studio</p>
  <span class="cover-badge">v1.0 · March 2025</span>
  <p class="cover-url">ragorchestrationstudio.com</p>
</div>

<!-- ── TABLE OF CONTENTS ─────────────────────────────────────────────── -->
<div class="toc">
  <h2>Contents</h2>
  <ol>
    <li><a href="#signing-in">Signing In</a></li>
    <li><a href="#catalog">Architecture Catalog</a></li>
    <li><a href="#designer">Guided Designer — Configure</a></li>
    <li><a href="#generate">Guided Designer — Generate Workflow</a></li>
    <li><a href="#builder">Workflow Builder</a></li>
    <li><a href="#query-lab">Query Lab</a></li>
    <li><a href="#integrations">Integrations</a></li>
    <li><a href="#environments">Environments</a></li>
    <li><a href="#governance">Governance &amp; Guardrails</a></li>
    <li><a href="#observability">Observability &amp; Traces</a></li>
    <li><a href="#admin">Admin — Users, Roles &amp; Teams</a></li>
    <li><a href="#flow">End-to-End Flow</a></li>
  </ol>
</div>

<!-- ── FLOW BANNER ───────────────────────────────────────────────────── -->
<div class="flow-banner">
  Architecture Catalog
  <span class="flow-arrow">→</span> Guided Designer
  <span class="flow-arrow">→</span> Generate Workflow
  <span class="flow-arrow">→</span> Workflow Builder
  <span class="flow-arrow">→</span> Query Lab
  <span class="flow-arrow">→</span> Observability
</div>

<!-- ── 1. SIGNING IN ────────────────────────────────────────────────── -->
<section id="signing-in">
  <h2>1 · Signing In</h2>
  <p>Navigate to <strong>ragorchestrationstudio.com</strong> and click <strong>Continue with Google</strong>. The platform uses Google OAuth — you will be redirected back immediately after authentication.</p>
  <figure>
    <img src="${imgSrc('landing.png')}" alt="RAG Studio landing page" />
    <figcaption>RAG Studio — landing page with Continue with Google</figcaption>
  </figure>
  <div class="callout">All results are <strong>simulated</strong> until real LLM API keys are connected via <strong>Integrations</strong>. A banner is shown on every page as a reminder.</div>
</section>

<!-- ── 2. ARCHITECTURE CATALOG ──────────────────────────────────────── -->
<section id="catalog">
  <h2>2 · Architecture Catalog</h2>
  <p>The <strong>Architecture Catalog</strong> is your starting point. It presents six RAG architecture patterns, each with a description, when-to-use guidance, strengths &amp; tradeoffs, and typical backend stacks.</p>

  <h3>Row 1 — Core architectures</h3>
  <figure>
    <img src="${imgSrc('catalog-row1.png')}" alt="Architecture Catalog — Vector, Vectorless, Graph RAG" />
    <figcaption>Architecture Catalog — Vector, Vectorless and Graph RAG cards</figcaption>
  </figure>
  <table>
    <tr><th>Architecture</th><th>Best For</th></tr>
    <tr><td>Vector RAG</td><td>Semantic similarity over embedded text corpora</td></tr>
    <tr><td>Vectorless RAG</td><td>Structured data, strict precision, no embedding overhead</td></tr>
    <tr><td>Graph RAG</td><td>Entity-rich data requiring multi-hop reasoning</td></tr>
  </table>

  <h3 style="page-break-before: always; padding-top: 1rem;">Row 2 — Advanced architectures</h3>
  <figure>
    <img src="${imgSrc('catalog-row2.png')}" alt="Architecture Catalog — Temporal, Hybrid, Custom RAG" />
    <figcaption>Architecture Catalog — Temporal, Hybrid and Custom RAG cards</figcaption>
  </figure>
  <table>
    <tr><th>Architecture</th><th>Best For</th></tr>
    <tr><td>Temporal RAG</td><td>Time-aware retrieval over event sequences</td></tr>
    <tr><td>Hybrid RAG</td><td>Combining vector, lexical, and graph strategies</td></tr>
    <tr><td>Custom RAG</td><td>Bespoke pipelines beyond standard patterns</td></tr>
  </table>
  <p>Click <strong>"Design this architecture"</strong> on any card to open the Guided Designer pre-configured for that type.</p>
</section>

<!-- ── 3. GUIDED DESIGNER — CONFIGURE ──────────────────────────────── -->
<section id="designer">
  <h2>3 · Guided Designer — Configure</h2>
  <p>After clicking "Design this architecture", the Guided Designer opens. The left panel shows a 3-step navigation; all configuration fields are visible simultaneously across three columns.</p>

  <div class="step">
    <div class="step-badge">1</div>
    <div class="step-body">
      <p class="step-title">Architecture profile</p>
      <figure><img src="${imgSrc('designer-step1.png')}" alt="Step 1" /><figcaption>Guided Designer — Step 1: Architecture profile</figcaption></figure>
      <table>
        <tr><th>Field</th><th>Description</th></tr>
        <tr><td>Data source type</td><td>File store, SQL, data warehouse…</td></tr>
        <tr><td>Chunking strategy</td><td>semantic, fixed-size, sentence…</td></tr>
        <tr><td>Embedding model</td><td>e.g. text-embedding-3-large</td></tr>
        <tr><td>Vector database</td><td>pgvector, Pinecone, Weaviate, Qdrant</td></tr>
      </table>
    </div>
  </div>

  <div class="step" style="page-break-before: always; padding-top: 1rem;">
    <div class="step-badge">2</div>
    <div class="step-body">
      <p class="step-title">Retrieval &amp; routing</p>
      <figure><img src="${imgSrc('designer-step2.png')}" alt="Step 2" /><figcaption>Guided Designer — Step 2: Retrieval &amp; routing</figcaption></figure>
      <table>
        <tr><th>Field</th><th>Description</th></tr>
        <tr><td>Similarity metric</td><td>cosine, dot product, or L2</td></tr>
        <tr><td>Top K</td><td>Number of chunks to retrieve (default 8)</td></tr>
        <tr><td>Metadata filters</td><td>DSL expressions to narrow the result set</td></tr>
        <tr><td>Reranker</td><td>Optional cross-encoder or SaaS reranker</td></tr>
      </table>
    </div>
  </div>

  <div class="step" style="page-break-before: always; padding-top: 1rem;">
    <div class="step-badge">3</div>
    <div class="step-body">
      <p class="step-title">Answering &amp; governance</p>
      <figure><img src="${imgSrc('designer-step3.png')}" alt="Step 3" /><figcaption>Guided Designer — Step 3: Answering &amp; governance</figcaption></figure>
      <table>
        <tr><th>Field</th><th>Description</th></tr>
        <tr><td>Answer generation model</td><td>The LLM for final answer synthesis</td></tr>
        <tr><td>Fallback strategy</td><td>llm_fallback, no_answer, or custom</td></tr>
      </table>
    </div>
  </div>
</section>

<!-- ── 4. GENERATE WORKFLOW ──────────────────────────────────────────── -->
<section id="generate">
  <h2>4 · Guided Designer — Generate Workflow</h2>
  <p>Once all three steps are reviewed, click <strong>"Generate workflow →"</strong> at the bottom-right.</p>
  <figure>
    <img src="${imgSrc('designer-generate.png')}" alt="Generate workflow" />
    <figcaption>Generate workflow — button transitions to "Generating workflow…" while processing</figcaption>
  </figure>
  <p>After generation completes you are automatically redirected to the <strong>Workflow Builder</strong> with the pipeline ready to inspect.</p>
  <div class="callout"><strong>Tip:</strong> Click "Save draft" at any time to persist the designer session without generating a workflow yet.</div>
</section>

<!-- ── 5. WORKFLOW BUILDER ───────────────────────────────────────────── -->
<section id="builder">
  <h2>5 · Workflow Builder</h2>
  <p>The Workflow Builder visualises your RAG pipeline as a <strong>node-based directed graph</strong>. Each node is a processing step; edges represent data flow.</p>
  <figure>
    <img src="${imgSrc('workflow-builder.png')}" alt="Workflow Builder" />
    <figcaption>Workflow Builder — generated Vector RAG node graph</figcaption>
  </figure>
  <table>
    <tr><th>Panel</th><th>Purpose</th></tr>
    <tr><td>Left — Nodes palette</td><td>Drag-and-drop nodes by category: Input &amp; Routing, Retrieval, Processing, Generation</td></tr>
    <tr><td>Centre — Canvas</td><td>Live pipeline graph. Zoom with +/−, fit-to-window via the fullscreen icon</td></tr>
    <tr><td>Right — Configuration</td><td>Click any canvas node to inspect and edit its settings</td></tr>
  </table>
  <table>
    <tr><th>Button</th><th>Effect</th></tr>
    <tr><td>Save Draft</td><td>Persist current state without publishing</td></tr>
    <tr><td>Publish</td><td>Mark the workflow active and available in Query Lab</td></tr>
  </table>
</section>

<!-- ── 6. QUERY LAB ──────────────────────────────────────────────────── -->
<section id="query-lab">
  <h2>6 · Query Lab</h2>
  <p>Test your workflows interactively. After generation, the workflow appears automatically in the <strong>Workflow</strong> dropdown.</p>
  <figure>
    <img src="${imgSrc('query-lab.png')}" alt="Query Lab" />
    <figcaption>Query Lab — workflow auto-loaded and ready to run</figcaption>
  </figure>
  <table>
    <tr><th>Field</th><th>Description</th></tr>
    <tr><td>Workflow</td><td>Select from all draft / published workflows</td></tr>
    <tr><td>Environment</td><td>Target environment: dev, staging, prod</td></tr>
    <tr><td>Query text</td><td>Your test question or instruction</td></tr>
    <tr><td>Strategies to compare</td><td>Tick any combination: Vector, Vectorless, Graph, Temporal, Hybrid</td></tr>
    <tr><td>Top-k</td><td>Retrieval hint — number of chunks returned</td></tr>
  </table>
  <p>Click <strong>"Run simulation"</strong> to execute. Results show per-strategy latency, retrieved chunks, and the generated answer side-by-side.</p>
  <div class="callout"><em>"Backend returns simulated traces"</em> appears when no real API keys are configured. Connect an LLM in <strong>Integrations</strong> to enable live execution.</div>
</section>

<!-- ── 7. INTEGRATIONS ───────────────────────────────────────────────── -->
<section id="integrations">
  <h2>7 · Integrations</h2>
  <figure>
    <img src="${imgSrc('integrations.png')}" alt="Integrations" />
    <figcaption>Integrations page</figcaption>
  </figure>
  <p>Manage connectors to LLM providers, vector stores, and document sources.</p>
  <table>
    <tr><th>Category</th><th>Options</th></tr>
    <tr><td>LLM providers</td><td>OpenAI, Anthropic, Cohere, local models</td></tr>
    <tr><td>Vector stores</td><td>pgvector, Pinecone, Weaviate, Qdrant</td></tr>
    <tr><td>Document sources</td><td>S3, GCS, SharePoint, SQL databases</td></tr>
    <tr><td>Graph databases</td><td>Neo4j, Amazon Neptune, ArangoDB</td></tr>
  </table>
</section>

<!-- ── 8. ENVIRONMENTS ──────────────────────────────────────────────── -->
<section id="environments">
  <h2>8 · Environments</h2>
  <figure>
    <img src="${imgSrc('environments.png')}" alt="Environments" />
    <figcaption>Environments page</figcaption>
  </figure>
  <p>Environments are deployment targets for your workflows, each with its own integration bindings and configuration overrides.</p>
  <table>
    <tr><th>Environment</th><th>Typical Use</th></tr>
    <tr><td>dev</td><td>Local / sandbox testing, simulated execution</td></tr>
    <tr><td>staging</td><td>Pre-production validation with real LLMs</td></tr>
    <tr><td>prod</td><td>Live deployment serving end-user queries</td></tr>
  </table>
</section>

<!-- ── 9. GOVERNANCE ────────────────────────────────────────────────── -->
<section id="governance">
  <h2>9 · Governance &amp; Guardrails</h2>
  <figure>
    <img src="${imgSrc('governance.png')}" alt="Governance" />
    <figcaption>Governance &amp; Guardrails page</figcaption>
  </figure>
  <p>Define and enforce policies across the platform lifecycle.</p>
  <table>
    <tr><th>Policy scope</th><th>Example</th></tr>
    <tr><td>workflow</td><td>Require 2 approvals before publishing</td></tr>
    <tr><td>environment</td><td>Block promotion if evaluation score &lt; threshold</td></tr>
    <tr><td>architecture</td><td>Whitelist permitted architecture types</td></tr>
  </table>
</section>

<!-- ── 10. OBSERVABILITY ────────────────────────────────────────────── -->
<section id="observability">
  <h2>10 · Observability &amp; Traces</h2>
  <figure>
    <img src="${imgSrc('observability.png')}" alt="Observability" />
    <figcaption>Observability &amp; Trace Analytics page</figcaption>
  </figure>
  <table>
    <tr><th>Feature</th><th>Description</th></tr>
    <tr><td>Run history</td><td>Timestamped log of every execution with status</td></tr>
    <tr><td>Trace analytics</td><td>Per-node latency breakdown for any selected run</td></tr>
    <tr><td>Audit trail</td><td>Who published, promoted, or modified which workflow</td></tr>
  </table>
</section>

<!-- ── 11. ADMIN ────────────────────────────────────────────────────── -->
<section id="admin">
  <h2>11 · Admin — Users, Roles &amp; Teams</h2>
  <figure>
    <img src="${imgSrc('admin-users.png')}" alt="Admin Users" />
    <figcaption>Admin Users page</figcaption>
  </figure>
  <p><strong>Users</strong> — view all platform users, their roles, and last login. Invite by email; sign-in via Google OAuth.</p>
  <p><strong>Roles</strong> — RAG Studio uses RBAC:</p>
  <table>
    <tr><th>Role</th><th>Access</th></tr>
    <tr><td>Platform Admin</td><td>Full access including admin and governance</td></tr>
    <tr><td>AI Architect</td><td>Create / edit workflows, publish, manage integrations</td></tr>
    <tr><td>ML Engineer</td><td>Edit workflows and run Query Lab</td></tr>
    <tr><td>Viewer</td><td>Read-only across all modules</td></tr>
  </table>
  <p><strong>Teams</strong> — group users to scope workflow ownership and governance approval routing.</p>
</section>

<!-- ── END-TO-END FLOW ──────────────────────────────────────────────── -->
<section id="flow">
  <h2>End-to-End Flow</h2>
  <pre>Architecture Catalog  (pick a pattern)
  └─ "Design this architecture"
       └─ Guided Designer  (step 1: profile → step 2: retrieval → step 3: governance)
            └─ "Generate workflow →"
                 └─ Workflow Builder  (review / edit node graph, then Publish)
                      └─ Query Lab  (test with real or simulated traces)
                           └─ Observability  (monitor runs + audit trail)</pre>
</section>

<p class="footer-note">RAG Orchestration Studio v1.0 &nbsp;·&nbsp; ragorchestrationstudio.com</p>

</body>
</html>`

// ── Write HTML to temp file, then render to PDF with puppeteer ────────────
async function main() {
  console.log('Installing puppeteer (if needed)…')

  let puppeteer
  try {
    puppeteer = require('puppeteer')
  } catch {
    const { execSync } = require('child_process')
    execSync('npm install puppeteer --no-save', { stdio: 'inherit', cwd: __dirname + '/..' })
    puppeteer = require('puppeteer')
  }

  console.log('Launching headless Chrome…')
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()

  // Large base64 images make networkidle0 hang — use domcontentloaded + extra wait
  page.setDefaultNavigationTimeout(120_000)
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  // Give images a moment to decode
  await new Promise(r => setTimeout(r, 3000))

  const outPath = path.resolve(__dirname, '../frontend/public/user-guide.pdf')
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', right: '16mm', bottom: '18mm', left: '16mm' },
    displayHeaderFooter: true,
    headerTemplate: `<div style="width:100%;font-size:8px;color:#888;padding:0 16mm;display:flex;justify-content:space-between;">
      <span>RAG Orchestration Studio — User Guide</span><span></span>
    </div>`,
    footerTemplate: `<div style="width:100%;font-size:8px;color:#888;padding:0 16mm;display:flex;justify-content:flex-end;">
      <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>`,
  })

  await browser.close()
  console.log('✅  PDF saved to', outPath)
}

main().catch(err => { console.error(err); process.exit(1) })
