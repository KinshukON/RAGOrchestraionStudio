import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listWorkflowRuns } from '../../api/workflowRuns'
import { listBenchmarkQueries, exportEvaluations } from '../../api/evaluations'
import type { WorkflowRunSummary } from '../../api/workflowRuns'
import type { BenchmarkQuery } from '../../api/evaluations'
import './research-assistant.css'

// ── Types ──────────────────────────────────────────────────────────────────
type Message = {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    blocks?: AnswerBlock[]
}

type AnswerBlock =
    | { type: 'table'; headers: string[]; rows: string[][] }
    | { type: 'code'; content: string }
    | { type: 'list'; items: string[] }
    | { type: 'callout'; text: string; variant: 'info' | 'warn' | 'success' }

// ── Intent definitions ────────────────────────────────────────────────────
type Intent =
    | 'what_tested'
    | 'what_workflows'
    | 'what_inputs'
    | 'what_outputs'
    | 'what_metrics'
    | 'real_vs_simulated'
    | 'benchmark'
    | 'export'
    | 'experiment_lookup'
    | 'greeting'
    | 'help'
    | 'unknown'

function detectIntent(text: string, runs: WorkflowRunSummary[]): { intent: Intent; expId?: string } {
    const t = text.toLowerCase()
    if (/^(hi|hello|hey|greet)/i.test(t.trim())) return { intent: 'greeting' }
    if (/help|what can|how to|commands/i.test(t)) return { intent: 'help' }
    if (/what.*(was tested|did.*test|test(ed)?.*on)/i.test(t)) return { intent: 'what_tested' }
    if (/workflow|architecture|strategy|strateg/i.test(t) && /(what|which|list)/i.test(t)) return { intent: 'what_workflows' }
    if (/input|quer(y|ies)|prompt/i.test(t)) return { intent: 'what_inputs' }
    if (/output|answer|response|result/i.test(t)) return { intent: 'what_outputs' }
    if (/metric|latency|token|chunk|score|confidence|benchmark|measure/i.test(t)) return { intent: 'what_metrics' }
    if (/real|simul|live|actual|fake/i.test(t)) return { intent: 'real_vs_simulated' }
    if (/benchmark|evaluat|rubric|grading|harness/i.test(t)) return { intent: 'benchmark' }
    if (/export|download|csv|json|artifact/i.test(t)) return { intent: 'export' }
    // Experiment ID lookup
    const expMatch = text.match(/exp-\d{8}-[a-z0-9]+/i)
    if (expMatch) {
        const expId = expMatch[0]
        const run = runs.find(r => r.experiment_id === expId)
        return { intent: 'experiment_lookup', expId: run ? expId : undefined }
    }
    return { intent: 'unknown' }
}

// ── Answer builders ────────────────────────────────────────────────────────
function buildAnswer(
    intent: Intent,
    expId: string | undefined,
    runs: WorkflowRunSummary[],
    benchmarks: BenchmarkQuery[],
): { text: string; blocks: AnswerBlock[] } {
    switch (intent) {
        case 'greeting':
            return {
                text: 'Hello! I\'m the RAG Studio Research Assistant. I can answer questions about your experiments, metrics, benchmarks, and methodology. Try asking "What metrics were collected?" or "What is real vs simulated?"',
                blocks: [],
            }

        case 'help':
            return {
                text: 'Here\'s what I can answer:',
                blocks: [{
                    type: 'list' as const,
                    items: [
                        '"What was tested?" — summary of all recorded experiments',
                        '"What workflows/architectures were used?" — strategy breakdown',
                        '"What inputs/queries were run?" — list of all queries',
                        '"What outputs were observed?" — sample answers per strategy',
                        '"What metrics were collected?" — latency, tokens, confidence table',
                        '"What is real vs simulated?" — methodology statement',
                        '"Benchmark / evaluation results" — scoring summary',
                        '"Export / download" — download full run data as JSON',
                        'Paste an experiment ID (e.g. exp-20260314-abc12345) for a specific trace',
                    ],
                }],
            }

        case 'what_tested': {
            const total = runs.length
            const stratSet = new Set<string>()
            runs.forEach(r => (r.strategies_run ?? []).forEach(s => stratSet.add(s)))
            const queries = [...new Set(runs.map(r => r.query).filter(Boolean))]
            return {
                text: `${total} experiment run(s) recorded covering ${stratSet.size} architecture strategy type(s). ${queries.length} unique query/queries tested.`,
                blocks: [
                    { type: 'callout', text: 'All runs are simulated (is_simulated: true). No external LLM API keys are consumed. Metrics are deterministic from the simulation engine.', variant: 'warn' },
                    { type: 'list', items: [...stratSet].map(s => `Strategy: ${s}`) },
                ],
            }
        }

        case 'what_workflows': {
            if (runs.length === 0) return { text: 'No runs recorded yet. Run a query in Query Lab first.', blocks: [] }
            const stratCount: Record<string, number> = {}
            runs.forEach(r => (r.strategies_run ?? []).forEach(s => { stratCount[s] = (stratCount[s] ?? 0) + 1 }))
            return {
                text: `The following architecture strategies have been executed across ${runs.length} run(s):`,
                blocks: [{
                    type: 'table',
                    headers: ['Strategy', 'Runs', 'Description'],
                    rows: [
                        ['vector', String(stratCount['vector'] ?? 0), 'Dense embedding + ANN cosine similarity'],
                        ['vectorless', String(stratCount['vectorless'] ?? 0), 'BM25 lexical retrieval, no embeddings'],
                        ['graph', String(stratCount['graph'] ?? 0), 'Neo4j Cypher multi-hop entity traversal'],
                        ['temporal', String(stratCount['temporal'] ?? 0), 'Recency-filtered vector search'],
                        ['hybrid', String(stratCount['hybrid'] ?? 0), 'RRF fusion: dense + sparse + cross-encoder rerank'],
                    ],
                }],
            }
        }

        case 'what_inputs': {
            const queries = runs.map(r => ({ q: r.query ?? '(unknown)', id: r.experiment_id ?? '—' }))
                .filter(r => r.q !== '(unknown)')
            if (queries.length === 0) return { text: 'No query inputs recorded yet.', blocks: [] }
            return {
                text: `${queries.length} unique run(s) with the following queries:`,
                blocks: [{
                    type: 'table',
                    headers: ['Experiment ID', 'Query (truncated)'],
                    rows: queries.slice(0, 10).map(q => [q.id, q.q.slice(0, 80) + (q.q.length > 80 ? '…' : '')]),
                }],
            }
        }

        case 'what_outputs':
            return {
                text: 'Each multi-strategy run produces one answer per architecture. Here is an example of what each answer references:',
                blocks: [{
                    type: 'table',
                    headers: ['Strategy', 'Answer style'],
                    rows: [
                        ['vector', 'Cites dense retrieval cosine similarity hit count and top chunks'],
                        ['vectorless', 'Cites BM25 term-frequency ranked passages'],
                        ['graph', 'Cites Cypher hop-depth and entity relationships traversed'],
                        ['temporal', 'Cites recency window and date-filtered passage count'],
                        ['hybrid', 'Cites RRF score, vector + lexical hit counts, and cross-encoder reranker'],
                    ],
                }, {
                    type: 'callout',
                    text: 'Answers include [Simulated · {Strategy} RAG] labels so the method is always transparent.',
                    variant: 'info',
                }],
            }

        case 'what_metrics': {
            const KNOWN = [
                { s: 'vector', lat: '455–767', tin: '1120–1320', tout: '165–225', conf: '78–86%', risk: 'low' },
                { s: 'vectorless', lat: '348–593', tin: '870–1070', tout: '140–200', conf: '70–78%', risk: 'medium' },
                { s: 'graph', lat: '567–949', tin: '1370–1570', tout: '195–255', conf: '82–90%', risk: 'low' },
                { s: 'temporal', lat: '432–721', tin: '970–1170', tout: '152–212', conf: '74–82%', risk: 'low' },
                { s: 'hybrid', lat: '563–920', tin: '1620–1820', tout: '225–285', conf: '87–95%', risk: 'very low' },
            ]
            return {
                text: `The following metrics are captured per strategy run. Per-stage latency is broken down in each trace's \`spans\` array.`,
                blocks: [
                    {
                        type: 'table',
                        headers: ['Strategy', 'Total latency (ms)', 'Input tokens', 'Output tokens', 'Confidence', 'Hallucination risk'],
                        rows: KNOWN.map(k => [k.s, k.lat, k.tin, k.tout, k.conf, k.risk]),
                    },
                    {
                        type: 'list',
                        items: [
                            'Per-stage spans: query_embedding, vector_retrieval, lexical_retrieval, graph_traversal, temporal_filter, metadata_filter, rrf_fusion, reranking, context_assembly, llm_generation',
                            'Retrieved chunk count (chunks_retrieved)',
                            'Rerank latency (rerank_latency_ms)',
                            'LLM generation latency (llm_latency_ms)',
                            'Confidence score (0–1)',
                            'Hallucination risk (very low / low / medium)',
                        ],
                    },
                ],
            }
        }

        case 'real_vs_simulated':
            return {
                text: 'What is real vs simulated in this application:',
                blocks: [
                    {
                        type: 'table',
                        headers: ['Component', 'Status', 'Notes'],
                        rows: [
                            ['Architecture workflow graph', 'Real', 'Persisted in Postgres via SQLModel WorkflowDefinition'],
                            ['Design sessions, wizard state', 'Real', 'Persisted via DesignSession model'],
                            ['Integration records', 'Real', 'Persisted Integration rows in DB'],
                            ['Environment binding matrix', 'Real', 'Persisted Environment rows in DB'],
                            ['Governance policies & rules', 'Real', 'Persisted GovernancePolicy / ApprovalRule in DB'],
                            ['RAG pipeline execution', 'Simulated', 'simulation.py produces deterministic rich traces'],
                            ['Retrieved chunks / passages', 'Simulated', '8-document synthetic corpus, per-strategy selection'],
                            ['LLM answers', 'Simulated', 'Template-based, strategy-aware answer strings'],
                            ['Token counts', 'Simulated', 'Strategy-realistic ranges with seeded jitter'],
                            ['Stage latency spans', 'Simulated', 'Bounded random ranges per node type'],
                            ['Experiment IDs', 'Real (UUID)', 'Generated server-side, stored in WorkflowRun'],
                            ['User auth (Google OAuth)', 'Real', 'Firebase / JWT via Supabase Postgres'],
                        ],
                    },
                    {
                        type: 'callout',
                        text: 'The SimBanner is shown on every page as a persistent reminder that pipeline execution is simulated.',
                        variant: 'warn',
                    },
                ],
            }

        case 'benchmark': {
            const scored = benchmarks.filter(b => b.status === 'scored')
            if (benchmarks.length === 0) return { text: 'No benchmark queries available yet.', blocks: [] }
            return {
                text: `${benchmarks.length} benchmark queries loaded (${scored.length} scored). Six are pre-seeded canonical enterprise RAG queries.`,
                blocks: [
                    {
                        type: 'table',
                        headers: ['ID', 'Tag', 'Query (truncated)', 'Status'],
                        rows: benchmarks.slice(0, 8).map(b => [
                            b.id, b.scenario_tag, b.query.slice(0, 60) + '…', b.status,
                        ]),
                    },
                    scored.length > 0 ? {
                        type: 'callout',
                        text: `${scored.length} queries have been scored. Download the evaluation CSV from the Evaluation Harness page to get per-strategy relevance, groundedness, completeness, and composite scores.`,
                        variant: 'success',
                    } : {
                        type: 'callout', text: 'Run benchmarks from the Evaluation Harness page to generate scores.', variant: 'info',
                    },
                ] as AnswerBlock[],
            }
        }

        case 'export':
            return {
                text: 'You can export data from two places:',
                blocks: [{
                    type: 'list',
                    items: [
                        'Query Lab → "Export all strategies (JSON)" button on any completed run',
                        'Query Lab → individual "↓ Export JSON" button per strategy card',
                        'Evaluation Harness → "↓ Export JSON" and "↓ Export CSV" for benchmark scores',
                        'I can also trigger a full export here — ask me "download full export"',
                    ],
                }],
            }

        case 'experiment_lookup': {
            const run = runs.find(r => r.experiment_id === expId)
            if (!run) return { text: `No run found with experiment ID ${expId ?? '(unknown)'}. Check your run history in Query Lab.`, blocks: [] }
            return {
                text: `Run found for experiment ${expId}:`,
                blocks: [{
                    type: 'table',
                    headers: ['Field', 'Value'],
                    rows: [
                        ['Experiment ID', run.experiment_id ?? '—'],
                        ['Workflow ID', run.workflow_id],
                        ['Query', (run.query ?? '—').slice(0, 100)],
                        ['Strategies', (run.strategies_run ?? []).join(', ')],
                        ['Status', run.status],
                        ['Timestamp', run.created_at],
                    ],
                }],
            }
        }

        default:
            return {
                text: "I didn't quite catch that. Try asking about tests, metrics, workflows, inputs, outputs, benchmarks, or what's real vs simulated. Type **help** for a full command list.",
                blocks: [],
            }
    }
}

// ── Message renderer ───────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
    const [copied, setCopied] = useState(false)
    return (
        <div className={`ra-bubble ra-bubble--${msg.role}`}>
            <div className="ra-bubble-header">
                <span className="ra-bubble-role">{msg.role === 'user' ? 'You' : '🤖 Research Assistant'}</span>
                <span className="ra-bubble-time">{msg.timestamp}</span>
            </div>
            <div className="ra-bubble-text">{msg.content}</div>
            {(msg.blocks ?? []).map((block, i) => {
                if (block.type === 'table') {
                    return (
                        <div key={i} className="ra-table-wrap">
                            <table className="ra-table">
                                <thead>
                                    <tr>{block.headers.map((h, j) => <th key={j}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {block.rows.map((row, j) => (
                                        <tr key={j}>{row.map((cell, k) => <td key={k}>{cell}</td>)}</tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                }
                if (block.type === 'list') {
                    return (
                        <ul key={i} className="ra-answer-list">
                            {block.items.map((item, j) => <li key={j}>{item}</li>)}
                        </ul>
                    )
                }
                if (block.type === 'code') {
                    return (
                        <div key={i} className="ra-code-block">
                            <pre>{block.content}</pre>
                            <button
                                className="ra-copy-btn"
                                onClick={() => { navigator.clipboard.writeText(block.content); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    )
                }
                if (block.type === 'callout') {
                    return (
                        <div key={i} className={`ra-callout ra-callout--${block.variant}`}>
                            {block.text}
                        </div>
                    )
                }
                return null
            })}
        </div>
    )
}

// ── Typing indicator ───────────────────────────────────────────────────────
function TypingIndicator() {
    return (
        <div className="ra-bubble ra-bubble--assistant ra-typing">
            <span />
            <span />
            <span />
        </div>
    )
}

// ── Main page ──────────────────────────────────────────────────────────────
const SUGGESTED = [
    'What was tested?',
    'What metrics were collected?',
    'What is real vs simulated?',
    'What workflows were used?',
    'Show benchmark results',
]

export function ResearchAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([{
        id: '0',
        role: 'assistant',
        content: 'Hello! I\'m the RAG Studio Research Assistant. I can answer methodology questions about your experiments. Try one of the suggested prompts below or type your own.',
        timestamp: new Date().toLocaleTimeString(),
        blocks: [],
    }])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)

    const runsQuery = useQuery({ queryKey: ['workflow-runs'], queryFn: listWorkflowRuns })
    const benchmarksQuery = useQuery({ queryKey: ['benchmark-queries'], queryFn: () => listBenchmarkQueries() })

    const runs = runsQuery.data ?? []
    const benchmarks = benchmarksQuery.data ?? []

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    async function sendMessage(text: string) {
        if (!text.trim()) return
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date().toLocaleTimeString(),
        }
        setMessages(m => [...m, userMsg])
        setInput('')
        setLoading(true)

        // Simulate minimal network delay for feel
        await new Promise(r => setTimeout(r, 400 + Math.random() * 400))

        // Handle export trigger
        if (/download.*export|export.*all|full.*export/i.test(text)) {
            const data = await exportEvaluations()
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = 'rag-evaluation-export.json'; a.click()
            URL.revokeObjectURL(url)
            setMessages(m => [...m, {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Download started — check your downloads folder for `rag-evaluation-export.json`.',
                timestamp: new Date().toLocaleTimeString(),
                blocks: [],
            }])
            setLoading(false)
            return
        }

        const { intent, expId } = detectIntent(text, runs)
        const { text: answerText, blocks } = buildAnswer(intent, expId, runs, benchmarks)

        const assistantMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: answerText,
            timestamp: new Date().toLocaleTimeString(),
            blocks,
        }
        setMessages(m => [...m, assistantMsg])
        setLoading(false)
    }

    return (
        <div className="ra-page">
            <div className="ra-header">
                <h1 className="ra-title">Research Assistant</h1>
                <p className="ra-subtitle">
                    Answers questions about experiments, metrics, and methodology from stored run data.
                    No external LLM — reads directly from your run history and evaluation harness.
                </p>
            </div>

            <div className="ra-chat-area">
                {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                {loading && <TypingIndicator />}
                <div ref={bottomRef} />
            </div>

            {/* Suggested */}
            <div className="ra-suggestions">
                {SUGGESTED.map(s => (
                    <button
                        key={s}
                        className="ra-suggestion-pill"
                        onClick={() => sendMessage(s)}
                        disabled={loading}
                    >
                        {s}
                    </button>
                ))}
            </div>

            <form
                className="ra-input-row"
                onSubmit={e => { e.preventDefault(); sendMessage(input) }}
            >
                <input
                    className="ra-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask about your experiments…"
                    disabled={loading}
                    autoFocus
                />
                <button className="ra-send-btn" type="submit" disabled={loading || !input.trim()}>
                    {loading ? '…' : 'Send'}
                </button>
            </form>
        </div>
    )
}
