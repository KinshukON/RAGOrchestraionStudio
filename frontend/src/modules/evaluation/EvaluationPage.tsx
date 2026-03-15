import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    listBenchmarkQueries,
    createBenchmarkQuery,
    scoreBenchmarkQuery,
    exportEvaluations,
    type BenchmarkQuery,
    type BenchmarkScoreInput,
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
export function EvaluationPage() {
    const { success, error } = useToast()
    const qc = useQueryClient()
    const [tagFilter, setTagFilter] = useState<string>('')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [showAdd, setShowAdd] = useState(false)
    const [runningId, setRunningId] = useState<string | null>(null)
    const [pendingRatings, setPendingRatings] = useState<Record<string, Record<string, number>>>({})
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

    const queries = bqQuery.data ?? []
    const workflows = workflowsQuery.data ?? []
    const selectedBq = queries.find(q => q.id === selectedId) ?? null

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
                const trace = r.trace as typeof r.trace & { chunks_retrieved?: number }
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
            success(`Ran & scored ${resp.results.length} strategies`)
        } catch (e) {
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
                    {/* Tag filter */}
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

                {/* Table */}
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
            </div>

            {/* ── Right panel ── */}
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
                                                <td><span className="ev-strategy-badge">{sid}</span></td>
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
        </div>
    )
}
