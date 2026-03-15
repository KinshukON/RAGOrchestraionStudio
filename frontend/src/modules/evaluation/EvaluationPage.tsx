import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    listBenchmarkQueries,
    createBenchmarkQuery,
    scoreBenchmarkQuery,
    exportEvaluations,
    aggregatedScores,
    type BenchmarkQuery,
    type BenchmarkScoreInput,
    type AggregatedScores,
} from '../../api/evaluations'
import { runWorkflowMulti, listWorkflows } from '../../api/workflows'
import { useToast } from '../ui/ToastContext'
import './evaluation.css'

// ── Helpers ─────────────────────────────────────────────────────────────────
function downloadJson(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

function downloadCsv(queries: BenchmarkQuery[]) {
    const cols = [
        'id', 'query', 'scenario_tag', 'difficulty', 'status',
        'strategy', 'relevance', 'groundedness', 'completeness', 'composite',
        'latency_ms', 'confidence_score', 'human_rating',
    ]
    const rows: string[][] = [cols]
    for (const q of queries) {
        const strategies = q.scores?.per_strategy ?? {}
        if (Object.keys(strategies).length === 0) {
            rows.push([
                q.id, `"${q.query.replace(/"/g, '""')}"`, q.scenario_tag, q.difficulty, q.status,
                '', '', '', '', '', '', '', '',
            ])
        } else {
            for (const [sid, s] of Object.entries(strategies)) {
                rows.push([
                    q.id,
                    `"${q.query.replace(/"/g, '""')}"`,
                    q.scenario_tag, q.difficulty, q.status,
                    sid,
                    String(s.heuristic?.relevance ?? ''),
                    String(s.heuristic?.groundedness ?? ''),
                    String(s.heuristic?.completeness ?? ''),
                    String(s.heuristic?.composite ?? ''),
                    String(s.latency_ms ?? ''),
                    String(s.confidence_score ?? ''),
                    String(s.human_rating ?? ''),
                ])
            }
        }
    }
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'benchmark-scores.csv'
    a.click()
    URL.revokeObjectURL(url)
}

const TAGS = ['semantic', 'structured', 'graph', 'temporal', 'policy'] as const

// ── Strategy colour map ───────────────────────────────────────────────────────
const STRATEGY_COLORS: Record<string, string> = {
    vector: '#818cf8',
    vectorless: '#38bdf8',
    graph: '#34d399',
    temporal: '#fb923c',
    hybrid: '#a78bfa',
}

// ── Score display helpers ────────────────────────────────────────────────────
function ScoreBar({ value }: { value: number }) {
    const pct = Math.round(value * 100)
    const cls = pct >= 70 ? 'good' : pct >= 40 ? 'fair' : 'poor'
    return (
        <div className="ev-score-bar-wrap" title={`${pct}%`}>
            <div className={`ev-score-bar ev-score-bar--${cls}`} style={{ width: `${pct}%` }} />
            <span className="ev-score-val">{pct}%</span>
        </div>
    )
}

function StarRating({ value, onChange }: { value: number | null; onChange?: (v: number) => void }) {
    return (
        <div className="ev-stars">
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n}
                    type="button"
                    className={`ev-star ${value !== null && n <= value ? 'ev-star--lit' : ''}`}
                    onClick={() => onChange?.(n)}
                    aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                >★</button>
            ))}
        </div>
    )
}

// ────────────────────────────────────────────────────────────────────────────
// SVG CHARTS (zero external dependencies)
// ────────────────────────────────────────────────────────────────────────────

const STRATEGIES = ['vector', 'vectorless', 'graph', 'temporal', 'hybrid']

// Chart 1 — Latency grouped horizontal bar chart
function LatencyChart({ data }: { data: AggregatedScores['latency'] }) {
    if (!data || data.length === 0) return <p className="ev-chart-empty">No latency data yet.</p>

    // Group rows by query label
    const queryLabels = [...new Set(data.map(r => r.label))]
    const maxLatency = Math.max(...data.map(r => r.latency_ms), 1)

    const rowH = 28
    const stratH = rowH * STRATEGIES.length
    const groupGap = 14
    const leftPad = 220
    const rightPad = 80
    const topPad = 40
    const barAreaW = 480
    const svgW = leftPad + barAreaW + rightPad
    const svgH = topPad + queryLabels.length * (stratH + groupGap) + 50

    return (
        <div className="ev-chart-wrap">
            <h3 className="ev-chart-title">Latency by Strategy (ms)</h3>
            <p className="ev-chart-note">Per benchmark query. Lower is faster.</p>
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="ev-svg">
                {/* X-axis ticks */}
                {[0, 0.25, 0.5, 0.75, 1].map(f => {
                    const x = leftPad + f * barAreaW
                    return (
                        <g key={f}>
                            <line x1={x} y1={topPad - 8} x2={x} y2={svgH - 30} stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
                            <text x={x} y={svgH - 14} textAnchor="middle" fontSize="10" fill="#94a3b8">
                                {Math.round(f * maxLatency)}
                            </text>
                        </g>
                    )
                })}
                <text x={leftPad + barAreaW / 2} y={svgH - 2} textAnchor="middle" fontSize="10" fill="#64748b">Latency (ms)</text>

                {queryLabels.map((label, qi) => {
                    const groupY = topPad + qi * (stratH + groupGap)
                    const rowData = STRATEGIES.map(s => data.find(r => r.label === label && r.strategy === s))
                    return (
                        <g key={label}>
                            {/* Query label */}
                            <text x={leftPad - 8} y={groupY + stratH / 2 + 4} textAnchor="end" fontSize="10" fill="#cbd5e1" className="ev-chart-label">
                                {label.length > 32 ? label.slice(0, 32) + '…' : label}
                            </text>
                            {/* Bars */}
                            {rowData.map((row, si) => {
                                const barW = row ? (row.latency_ms / maxLatency) * barAreaW : 0
                                const color = STRATEGY_COLORS[STRATEGIES[si]] ?? '#818cf8'
                                return (
                                    <g key={si}>
                                        <rect
                                            x={leftPad}
                                            y={groupY + si * rowH + 4}
                                            width={barW}
                                            height={rowH - 8}
                                            rx={3}
                                            fill={color}
                                            opacity={0.82}
                                        />
                                        {row && (
                                            <text
                                                x={leftPad + barW + 4}
                                                y={groupY + si * rowH + rowH - 10}
                                                fontSize="9"
                                                fill={color}
                                            >
                                                {row.latency_ms} ms
                                            </text>
                                        )}
                                    </g>
                                )
                            })}
                            {/* Divider */}
                            {qi < queryLabels.length - 1 && (
                                <line
                                    x1={leftPad - 8} y1={groupY + stratH + groupGap / 2}
                                    x2={svgW - 20} y2={groupY + stratH + groupGap / 2}
                                    stroke="#1e293b" strokeWidth="1"
                                />
                            )}
                        </g>
                    )
                })}

                {/* Legend */}
                {STRATEGIES.map((s, i) => (
                    <g key={s} transform={`translate(${leftPad + i * 88}, ${topPad - 22})`}>
                        <rect x={0} y={0} width={10} height={10} rx={2} fill={STRATEGY_COLORS[s]} />
                        <text x={13} y={9} fontSize="10" fill="#94a3b8">{s}</text>
                    </g>
                ))}
            </svg>
        </div>
    )
}

// Chart 2 — Score overview grouped vertical bar chart
function ScoreOverviewChart({ data }: { data: AggregatedScores['scores_overview'] }) {
    if (!data || data.length === 0) return <p className="ev-chart-empty">No score data yet.</p>

    const svgW = 620
    const svgH = 320
    const leftPad = 40
    const rightPad = 20
    const topPad = 50
    const botPad = 60
    const barAreaW = svgW - leftPad - rightPad
    const barAreaH = svgH - topPad - botPad
    const groupW = barAreaW / data.length
    const barW = groupW / 4
    const SCORE_LABELS = ['avg_relevance', 'avg_groundedness', 'avg_completeness'] as const
    const SCORE_COLORS = { avg_relevance: '#38bdf8', avg_groundedness: '#818cf8', avg_completeness: '#fb923c' }
    const SCORE_NAMES = { avg_relevance: 'Relevance', avg_groundedness: 'Groundedness', avg_completeness: 'Completeness' }

    return (
        <div className="ev-chart-wrap">
            <h3 className="ev-chart-title">Average Scores by Strategy</h3>
            <p className="ev-chart-note">Averaged across all 6 benchmark queries. Threshold line at 0.70.</p>
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="ev-svg">
                {/* Y-axis gridlines + labels */}
                {[0, 0.2, 0.4, 0.6, 0.7, 0.8, 1.0].map(v => {
                    const y = topPad + barAreaH - v * barAreaH
                    return (
                        <g key={v}>
                            <line
                                x1={leftPad} y1={y} x2={svgW - rightPad} y2={y}
                                stroke={v === 0.7 ? '#f59e0b' : '#1e293b'}
                                strokeWidth={v === 0.7 ? 1.2 : 0.5}
                                strokeDasharray={v === 0.7 ? '5,3' : '2,4'}
                            />
                            <text x={leftPad - 4} y={y + 4} textAnchor="end" fontSize="9" fill={v === 0.7 ? '#f59e0b' : '#64748b'}>
                                {v.toFixed(1)}
                            </text>
                            {v === 0.7 && (
                                <text x={svgW - rightPad + 2} y={y + 4} fontSize="9" fill="#f59e0b">threshold</text>
                            )}
                        </g>
                    )
                })}

                {/* Grouped bars per strategy */}
                {data.map((row, gi) => {
                    const gx = leftPad + gi * groupW + barW / 2
                    return (
                        <g key={row.strategy}>
                            {SCORE_LABELS.map((key, bi) => {
                                const val = row[key] as number
                                const bH = val * barAreaH
                                const bx = gx + bi * barW
                                const by = topPad + barAreaH - bH
                                const color = SCORE_COLORS[key]
                                return (
                                    <g key={key}>
                                        <rect x={bx} y={by} width={barW - 2} height={bH} rx={2} fill={color} opacity={0.85} />
                                        <text x={bx + (barW - 2) / 2} y={by - 4} textAnchor="middle" fontSize="8" fill={color}>
                                            {Math.round(val * 100)}
                                        </text>
                                    </g>
                                )
                            })}
                            {/* Strategy label */}
                            <text
                                x={gx + barW}
                                y={topPad + barAreaH + 16}
                                textAnchor="middle"
                                fontSize="10"
                                fill={STRATEGY_COLORS[row.strategy] ?? '#94a3b8'}
                                fontWeight="600"
                            >
                                {row.strategy}
                            </text>
                        </g>
                    )
                })}

                {/* Legend */}
                {SCORE_LABELS.map((k, i) => (
                    <g key={k} transform={`translate(${leftPad + i * 130}, ${topPad - 28})`}>
                        <rect x={0} y={0} width={10} height={10} rx={2} fill={SCORE_COLORS[k]} />
                        <text x={13} y={9} fontSize="10" fill="#94a3b8">{SCORE_NAMES[k]}</text>
                    </g>
                ))}
            </svg>
        </div>
    )
}

// Chart 3 — Per-query composite heatmap
function CompositeHeatmap({ data, strategies }: { data: AggregatedScores['per_query_heatmap']; strategies: string[] }) {
    if (!data || data.length === 0) return <p className="ev-chart-empty">No heatmap data yet.</p>

    const cellW = 90
    const cellH = 44
    const labelW = 220
    const headerH = 40
    const svgW = labelW + strategies.length * cellW + 20
    const svgH = headerH + data.length * cellH + 20

    function heatColor(v: number | null): string {
        if (v === null || v === undefined) return '#1e293b'
        // 0→red, 0.5→amber, 1→green using interpolation
        if (v < 0.5) {
            const t = v / 0.5
            const r = Math.round(220 - t * 60)
            const g = Math.round(38 + t * 120)
            return `rgb(${r},${g},58)`
        } else {
            const t = (v - 0.5) / 0.5
            const r = Math.round(160 - t * 110)
            const g = Math.round(158 + t * 52)
            return `rgb(${r},${g},58)`
        }
    }

    return (
        <div className="ev-chart-wrap">
            <h3 className="ev-chart-title">Composite Score Heatmap</h3>
            <p className="ev-chart-note">Queries × strategies. Green = high composite, Red = low.</p>
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="ev-svg ev-svg--heatmap">
                {/* Column headers */}
                {strategies.map((s, si) => (
                    <text
                        key={s}
                        x={labelW + si * cellW + cellW / 2}
                        y={headerH - 10}
                        textAnchor="middle"
                        fontSize="11"
                        fill={STRATEGY_COLORS[s] ?? '#94a3b8'}
                        fontWeight="600"
                    >
                        {s}
                    </text>
                ))}

                {/* Rows */}
                {data.map((row, ri) => (
                    <g key={row.query_id}>
                        {/* Row label */}
                        <text
                            x={labelW - 8}
                            y={headerH + ri * cellH + cellH / 2 + 4}
                            textAnchor="end"
                            fontSize="9"
                            fill="#cbd5e1"
                        >
                            {String(row.label).slice(0, 36)}{String(row.label).length > 36 ? '…' : ''}
                        </text>
                        {/* Cells */}
                        {strategies.map((s, si) => {
                            const val = row[s] as number | null
                            const displayVal = val !== null && val !== undefined ? Math.round(val * 100) : '—'
                            const textColor = val !== null && val > 0.55 ? '#fff' : '#e2e8f0'
                            return (
                                <g key={s}>
                                    <rect
                                        x={labelW + si * cellW + 1}
                                        y={headerH + ri * cellH + 2}
                                        width={cellW - 2}
                                        height={cellH - 4}
                                        rx={4}
                                        fill={heatColor(val)}
                                    />
                                    <text
                                        x={labelW + si * cellW + cellW / 2}
                                        y={headerH + ri * cellH + cellH / 2 + 5}
                                        textAnchor="middle"
                                        fontSize="12"
                                        fontWeight="700"
                                        fill={textColor}
                                    >
                                        {displayVal}
                                    </text>
                                </g>
                            )
                        })}
                    </g>
                ))}
            </svg>
        </div>
    )
}

// ── BenchmarkRow ─────────────────────────────────────────────────────────────
function BenchmarkRow({
    bq,
    selected,
    onSelect,
}: {
    bq: BenchmarkQuery
    selected: boolean
    onSelect: () => void
}) {
    const strategies = bq.scores?.per_strategy ?? {}
    const strategyCount = Object.keys(strategies).length
    const composite = strategyCount > 0
        ? Object.values(strategies).reduce((s, v) => s + (v.heuristic?.composite ?? 0), 0) / strategyCount
        : null

    return (
        <tr
            className={`ev-bq-row ${selected ? 'ev-bq-row--selected' : ''}`}
            onClick={onSelect}
        >
            <td>
                <span className={`ev-tag ev-tag--${bq.scenario_tag}`}>{bq.scenario_tag}</span>
            </td>
            <td className="ev-query-cell" title={bq.query}>{bq.query.slice(0, 80)}{bq.query.length > 80 ? '…' : ''}</td>
            <td>
                <span className={`ev-difficulty ev-difficulty--${bq.difficulty}`}>{bq.difficulty}</span>
            </td>
            <td>{strategyCount > 0 ? `${strategyCount} strategies` : '—'}</td>
            <td>{composite !== null ? <ScoreBar value={composite} /> : '—'}</td>
            <td>
                <span className={`ev-status ev-status--${bq.status}`}>{bq.status}</span>
            </td>
        </tr>
    )
}

// ── Main page ────────────────────────────────────────────────────────────────
type PanelTab = 'list' | 'charts'

export function EvaluationPage() {
    const { success, error } = useToast()
    const qc = useQueryClient()
    const [tagFilter, setTagFilter] = useState<string>('')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [showAdd, setShowAdd] = useState(false)
    const [runningId, setRunningId] = useState<string | null>(null)
    const [pendingRatings, setPendingRatings] = useState<Record<string, Record<string, number>>>({})
    const [panelTab, setPanelTab] = useState<PanelTab>('list')
    const [newQ, setNewQ] = useState({
        query: '',
        expected_answer: '',
        expected_evidence: '',
        rubric: '',
        scenario_tag: 'semantic' as string,
        difficulty: 'medium' as string,
    })

    const bqQuery = useQuery({
        queryKey: ['benchmark-queries', tagFilter],
        queryFn: () => listBenchmarkQueries(tagFilter || undefined),
    })
    const workflowsQuery = useQuery({ queryKey: ['workflows'], queryFn: listWorkflows })
    const aggQuery = useQuery({
        queryKey: ['aggregated-scores'],
        queryFn: aggregatedScores,
    })

    const queries = bqQuery.data ?? []
    const workflows = workflowsQuery.data ?? []
    const selectedBq = queries.find(q => q.id === selectedId) ?? null
    const agg = aggQuery.data

    const createMutation = useMutation({
        mutationFn: createBenchmarkQuery,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['benchmark-queries'] })
            setShowAdd(false)
            setNewQ({ query: '', expected_answer: '', expected_evidence: '', rubric: '', scenario_tag: 'semantic', difficulty: 'medium' })
            success('Benchmark query added')
        },
        onError: () => error('Failed to add query'),
    })

    const scoreMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: BenchmarkScoreInput }) =>
            scoreBenchmarkQuery(id, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['benchmark-queries'] })
            qc.invalidateQueries({ queryKey: ['aggregated-scores'] })
            success('Scores saved')
        },
    })

    async function runBenchmark(bq: BenchmarkQuery) {
        const wf = workflows[0]
        if (!wf) { error('No workflows available — run demo seed first'); return }
        setRunningId(bq.id)
        try {
            const resp = await runWorkflowMulti(wf.id, {
                query: bq.query,
                strategies: ['vector', 'vectorless', 'graph', 'temporal', 'hybrid'],
                parameters: { top_k: 5 },
            })
            // Auto-score each strategy
            for (const r of resp.results) {
                const retrievedTitles = (r.trace.retrieved_sources ?? []).map(s => {
                    const src = s as Record<string, unknown>
                    return String(src.title ?? '')
                })
                await scoreBenchmarkQuery(bq.id, {
                    strategy_id: r.strategy_id,
                    model_answer: r.trace.model_answer,
                    retrieved_titles: retrievedTitles,
                    latency_ms: r.trace.latency_ms,
                    confidence_score: r.trace.confidence_score,
                    human_rating: pendingRatings[bq.id]?.[r.strategy_id] ?? undefined,
                })
            }
            qc.invalidateQueries({ queryKey: ['benchmark-queries'] })
            qc.invalidateQueries({ queryKey: ['aggregated-scores'] })
            success(`Ran & scored ${resp.results.length} strategies`)
        } catch {
            error('Run failed')
        } finally {
            setRunningId(null)
        }
    }

    async function handleExport() {
        const data = await exportEvaluations()
        downloadJson(data, 'rag-evaluation-export.json')
    }

    return (
        <div className="ev-page">
            {/* ── Left panel ── */}
            <div className="ev-left">
                <div className="ev-left-header">
                    <h1 className="ev-title">Evaluation Harness</h1>
                    <p className="ev-subtitle">
                        Canonical benchmark queries · heuristic scoring · human rating
                    </p>
                    <div className="ev-left-actions">
                        <button className="ev-btn ev-btn--primary" onClick={() => setShowAdd(x => !x)}>
                            + Add query
                        </button>
                        <button className="ev-btn ev-btn--secondary" onClick={handleExport}>
                            ↓ Export JSON
                        </button>
                        <button className="ev-btn ev-btn--secondary" onClick={() => downloadCsv(queries)}>
                            ↓ Export CSV
                        </button>
                    </div>
                    {/* Tab switcher */}
                    <div className="ev-panel-tabs">
                        <button
                            className={`ev-panel-tab ${panelTab === 'list' ? 'ev-panel-tab--active' : ''}`}
                            onClick={() => { setPanelTab('list'); setSelectedId(null) }}
                        >
                            📋 Query List
                        </button>
                        <button
                            className={`ev-panel-tab ${panelTab === 'charts' ? 'ev-panel-tab--active' : ''}`}
                            onClick={() => setPanelTab('charts')}
                        >
                            📊 Charts
                        </button>
                    </div>
                    {/* Tag filter (only in list mode) */}
                    {panelTab === 'list' && (
                        <div className="ev-tag-filter">
                            <button
                                className={`ev-tag-pill ${!tagFilter ? 'ev-tag-pill--active' : ''}`}
                                onClick={() => setTagFilter('')}
                            >All</button>
                            {TAGS.map(t => (
                                <button
                                    key={t}
                                    className={`ev-tag-pill ev-tag-pill--${t} ${tagFilter === t ? 'ev-tag-pill--active' : ''}`}
                                    onClick={() => setTagFilter(t)}
                                >{t}</button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add form */}
                {showAdd && (
                    <form
                        className="ev-add-form"
                        onSubmit={e => {
                            e.preventDefault()
                            createMutation.mutate({
                                ...newQ,
                                expected_evidence: newQ.expected_evidence.split('\n').map(s => s.trim()).filter(Boolean),
                            })
                        }}
                    >
                        <h3>New benchmark query</h3>
                        <label className="ev-label">
                            Query
                            <textarea
                                className="ev-input ev-textarea"
                                required
                                rows={3}
                                value={newQ.query}
                                onChange={e => setNewQ(v => ({ ...v, query: e.target.value }))}
                            />
                        </label>
                        <label className="ev-label">
                            Expected answer
                            <textarea
                                className="ev-input ev-textarea"
                                rows={3}
                                value={newQ.expected_answer}
                                onChange={e => setNewQ(v => ({ ...v, expected_answer: e.target.value }))}
                            />
                        </label>
                        <label className="ev-label">
                            Expected evidence (one title per line)
                            <textarea
                                className="ev-input ev-textarea"
                                rows={2}
                                value={newQ.expected_evidence}
                                onChange={e => setNewQ(v => ({ ...v, expected_evidence: e.target.value }))}
                            />
                        </label>
                        <label className="ev-label">
                            Rubric / grading notes
                            <input
                                className="ev-input"
                                value={newQ.rubric}
                                onChange={e => setNewQ(v => ({ ...v, rubric: e.target.value }))}
                            />
                        </label>
                        <div className="ev-row">
                            <label className="ev-label">
                                Scenario tag
                                <select
                                    className="ev-input"
                                    value={newQ.scenario_tag}
                                    onChange={e => setNewQ(v => ({ ...v, scenario_tag: e.target.value }))}
                                >
                                    {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </label>
                            <label className="ev-label">
                                Difficulty
                                <select
                                    className="ev-input"
                                    value={newQ.difficulty}
                                    onChange={e => setNewQ(v => ({ ...v, difficulty: e.target.value }))}
                                >
                                    <option value="easy">easy</option>
                                    <option value="medium">medium</option>
                                    <option value="hard">hard</option>
                                </select>
                            </label>
                        </div>
                        <div className="ev-form-actions">
                            <button type="submit" className="ev-btn ev-btn--primary" disabled={createMutation.isPending}>
                                {createMutation.isPending ? 'Saving…' : 'Save query'}
                            </button>
                            <button type="button" className="ev-btn ev-btn--ghost" onClick={() => setShowAdd(false)}>
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {/* List view */}
                {panelTab === 'list' && (
                    <div className="ev-table-wrap">
                        <table className="ev-bq-table">
                            <thead>
                                <tr>
                                    <th>Tag</th>
                                    <th>Query</th>
                                    <th>Difficulty</th>
                                    <th>Runs</th>
                                    <th>Avg score</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bqQuery.isLoading ? (
                                    <tr><td colSpan={6} className="ev-loading">Loading…</td></tr>
                                ) : queries.length === 0 ? (
                                    <tr><td colSpan={6} className="ev-empty">No queries yet</td></tr>
                                ) : (
                                    queries.map(q => (
                                        <BenchmarkRow
                                            key={q.id}
                                            bq={q}
                                            selected={q.id === selectedId}
                                            onSelect={() => setSelectedId(v => v === q.id ? null : q.id)}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Charts view */}
                {panelTab === 'charts' && (
                    <div className="ev-charts-panel">
                        {aggQuery.isLoading ? (
                            <p className="ev-loading">Loading chart data…</p>
                        ) : !agg ? (
                            <p className="ev-empty">No chart data available.</p>
                        ) : (
                            <>
                                <LatencyChart data={agg.latency} />
                                <ScoreOverviewChart data={agg.scores_overview} />
                                <CompositeHeatmap data={agg.per_query_heatmap} strategies={agg.strategies} />
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ── Right panel (detail, list mode only) ── */}
            {panelTab === 'list' && (
                <div className={`ev-right ${!selectedBq ? 'ev-right--empty' : ''}`}>
                    {!selectedBq ? (
                        <div className="ev-right-placeholder">
                            <span className="ev-placeholder-icon">📊</span>
                            <p>Select a benchmark query to view scoring details</p>
                        </div>
                    ) : (
                        <div className="ev-scoring-panel">
                            <div className="ev-scoring-header">
                                <div>
                                    <span className={`ev-tag ev-tag--${selectedBq.scenario_tag}`}>{selectedBq.scenario_tag}</span>
                                    <span className={`ev-difficulty ev-difficulty--${selectedBq.difficulty}`}>{selectedBq.difficulty}</span>
                                </div>
                                <button
                                    className="ev-btn ev-btn--primary"
                                    disabled={runningId === selectedBq.id}
                                    onClick={() => runBenchmark(selectedBq)}
                                >
                                    {runningId === selectedBq.id ? '⟳ Running…' : '▶ Run benchmark'}
                                </button>
                            </div>

                            <div className="ev-query-block">
                                <span className="ev-field-label">Query</span>
                                <p className="ev-query-text">{selectedBq.query}</p>
                            </div>

                            {selectedBq.expected_answer && (
                                <div className="ev-query-block">
                                    <span className="ev-field-label">Expected answer</span>
                                    <p className="ev-query-text ev-query-text--muted">{selectedBq.expected_answer}</p>
                                </div>
                            )}

                            {selectedBq.expected_evidence?.length > 0 && (
                                <div className="ev-query-block">
                                    <span className="ev-field-label">Expected evidence</span>
                                    <ul className="ev-evidence-list">
                                        {selectedBq.expected_evidence.map((e, i) => <li key={i}>{e}</li>)}
                                    </ul>
                                </div>
                            )}

                            {selectedBq.rubric && (
                                <div className="ev-query-block ev-callout">
                                    <span className="ev-field-label">Rubric</span>
                                    <p className="ev-query-text ev-query-text--muted">{selectedBq.rubric}</p>
                                </div>
                            )}

                            {/* Per-strategy scores */}
                            <div className="ev-scores-section">
                                <h3>Per-strategy scores</h3>
                                {Object.keys(selectedBq.scores?.per_strategy ?? {}).length === 0 ? (
                                    <p className="ev-no-scores">No scores yet — click "Run benchmark" to evaluate</p>
                                ) : (
                                    <table className="ev-scores-table">
                                        <thead>
                                            <tr>
                                                <th>Strategy</th>
                                                <th>Relevance</th>
                                                <th>Groundedness</th>
                                                <th>Completeness</th>
                                                <th>Composite</th>
                                                <th>Latency</th>
                                                <th>Confidence</th>
                                                <th>Human ★</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(selectedBq.scores?.per_strategy ?? {}).map(([sid, s]) => (
                                                <tr key={sid} className="ev-score-row">
                                                    <td><span className="ev-strategy-badge" style={{ color: STRATEGY_COLORS[sid] ?? '#818cf8' }}>{sid}</span></td>
                                                    <td><ScoreBar value={s.heuristic?.relevance ?? 0} /></td>
                                                    <td><ScoreBar value={s.heuristic?.groundedness ?? 0} /></td>
                                                    <td><ScoreBar value={s.heuristic?.completeness ?? 0} /></td>
                                                    <td><ScoreBar value={s.heuristic?.composite ?? 0} /></td>
                                                    <td>{s.latency_ms} ms</td>
                                                    <td>{Math.round((s.confidence_score ?? 0) * 100)}%</td>
                                                    <td>
                                                        <StarRating
                                                            value={s.human_rating ?? (pendingRatings[selectedBq.id]?.[sid] ?? null)}
                                                            onChange={v => {
                                                                setPendingRatings(pr => ({
                                                                    ...pr,
                                                                    [selectedBq.id]: { ...(pr[selectedBq.id] ?? {}), [sid]: v },
                                                                }))
                                                                scoreMutation.mutate({
                                                                    id: selectedBq.id,
                                                                    payload: {
                                                                        strategy_id: sid,
                                                                        model_answer: '',
                                                                        human_rating: v,
                                                                    },
                                                                })
                                                            }}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Export this benchmark */}
                            <div className="ev-score-export">
                                <button
                                    className="ev-btn ev-btn--ghost"
                                    onClick={() => downloadJson(selectedBq, `${selectedBq.id}-scores.json`)}
                                >
                                    ↓ Export this query (JSON)
                                </button>
                                <button
                                    className="ev-btn ev-btn--ghost"
                                    onClick={() => downloadCsv([selectedBq])}
                                >
                                    ↓ Export scores (CSV)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
