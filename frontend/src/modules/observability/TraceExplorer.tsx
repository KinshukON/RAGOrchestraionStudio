import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { TaskSummary } from '../../api/observability'
import { listObservabilityRunTasks, getObservabilityRun } from '../../api/observability'
import './trace-explorer.css'

interface Props {
  runId: number
  onClose?: () => void
}

function latencyMs(task: TaskSummary): number | null {
  if (!task.started_at || !task.finished_at) return null
  return Math.round(new Date(task.finished_at).getTime() - new Date(task.started_at).getTime())
}

const NODE_TYPE_ICON: Record<string, string> = {
  input:      '📥',
  retriever:  '🔍',
  embedding:  '🧬',
  reranker:   '📐',
  llm:        '🤖',
  output:     '📤',
  filter:     '🔽',
  router:     '🔀',
  cache:      '💾',
  chunker:    '✂️',
  graph_retriever: '🕸️',
  temporal_filter: '⏱️',
}

function icon(nodeType: string) {
  return NODE_TYPE_ICON[nodeType] ?? '⚙️'
}

function StatusDot({ status }: { status: string }) {
  const cls =
    status === 'succeeded' || status === 'completed' ? 'te-dot te-dot--ok' :
    status === 'failed' || status === 'error'        ? 'te-dot te-dot--err' :
    status === 'running'                             ? 'te-dot te-dot--run' :
                                                       'te-dot te-dot--neutral'
  return <span className={cls} />
}

export function TraceExplorer({ runId, onClose }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)

  const runQ = useQuery({
    queryKey: ['observability-run', runId],
    queryFn: () => getObservabilityRun(runId),
  })

  const tasksQ = useQuery({
    queryKey: ['observability-run-tasks', runId],
    queryFn: () => listObservabilityRunTasks(runId),
  })

  const run = runQ.data
  const tasks = (tasksQ.data ?? []).slice().sort(
    (a, b) => (a.step_index ?? 0) - (b.step_index ?? 0)
  )

  // Compute per-task latencies and total span
  const latencies = tasks.map(latencyMs)
  const maxLatency = Math.max(1, ...latencies.filter(Boolean) as number[])
  const totalMs = latencies.reduce<number>((sum, l) => sum + (l ?? 0), 0)

  // Run-level wallclock
  const runWallMs = run?.started_at && run?.finished_at
    ? Math.round(new Date(run.finished_at).getTime() - new Date(run.started_at).getTime())
    : null

  const succeeded = tasks.filter(t => t.status === 'succeeded' || t.status === 'completed').length
  const failed = tasks.filter(t => t.status === 'failed' || t.status === 'error').length

  return (
    <div className="te-root">
      <div className="te-header">
        <div className="te-header-left">
          <h3 className="te-title">Trace Explorer — Run #{runId}</h3>
          <div className="te-meta">
            {run && (
              <>
                <span className={`te-badge te-badge--${run.status === 'succeeded' ? 'ok' : run.status === 'failed' ? 'err' : 'neutral'}`}>
                  {run.status}
                </span>
                {run.is_simulated && <span className="te-badge te-badge--sim">Simulated</span>}
                {run.architecture_type && <span className="te-badge te-badge--arch">{run.architecture_type}</span>}
              </>
            )}
          </div>
        </div>
        {onClose && (
          <button className="te-close" onClick={onClose} title="Close trace">✕</button>
        )}
      </div>

      {/* Summary row */}
      <div className="te-summary-row">
        <div className="te-summary-item">
          <span className="te-summary-val">{tasks.length}</span>
          <span className="te-summary-label">nodes</span>
        </div>
        <div className="te-summary-item te-summary-item--ok">
          <span className="te-summary-val">{succeeded}</span>
          <span className="te-summary-label">succeeded</span>
        </div>
        {failed > 0 && (
          <div className="te-summary-item te-summary-item--err">
            <span className="te-summary-val">{failed}</span>
            <span className="te-summary-label">failed</span>
          </div>
        )}
        <div className="te-summary-item">
          <span className="te-summary-val">{totalMs > 0 ? `${totalMs} ms` : '—'}</span>
          <span className="te-summary-label">sum latency</span>
        </div>
        {runWallMs !== null && (
          <div className="te-summary-item">
            <span className="te-summary-val">{runWallMs} ms</span>
            <span className="te-summary-label">wallclock</span>
          </div>
        )}
      </div>

      {/* Node timeline */}
      {tasksQ.isLoading && <p className="te-loading">Loading trace…</p>}

      {!tasksQ.isLoading && tasks.length === 0 && (
        <p className="te-empty">No task records for this run yet.</p>
      )}

      {!tasksQ.isLoading && tasks.length > 0 && (
        <div className="te-timeline">
          {tasks.map((task, idx) => {
            const lat = latencyMs(task)
            const barWidth = lat != null ? Math.max(2, (lat / maxLatency) * 100) : 0
            const isExpanded = expanded === task.id
            const meta = task.trace_metadata ?? {}

            return (
              <div key={task.id} className={`te-node ${isExpanded ? 'te-node--expanded' : ''}`}>
                <div className="te-node-row" onClick={() => setExpanded(isExpanded ? null : task.id)}>
                  {/* Step number */}
                  <span className="te-step-num">{idx + 1}</span>

                  {/* Status dot */}
                  <StatusDot status={task.status} />

                  {/* Icon + names */}
                  <span className="te-node-icon">{icon(task.node_type)}</span>
                  <div className="te-node-names">
                    <span className="te-node-id">{task.node_id}</span>
                    <span className="te-node-type">{task.node_type}</span>
                  </div>

                  {/* Latency bar */}
                  <div className="te-bar-wrap">
                    {lat != null && (
                      <>
                        <div
                          className={`te-bar ${task.status === 'failed' || task.status === 'error' ? 'te-bar--err' : task.node_type === 'llm' ? 'te-bar--llm' : 'te-bar--default'}`}
                          style={{ width: `${barWidth}%` }}
                        />
                        <span className="te-bar-label">{lat} ms</span>
                      </>
                    )}
                    {lat === null && <span className="te-bar-label te-bar-label--muted">—</span>}
                  </div>

                  {/* Expand chevron */}
                  <span className="te-chevron">{isExpanded ? '▲' : '▼'}</span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="te-detail">
                    <div className="te-detail-grid">
                      {task.started_at && (
                        <div className="te-detail-item">
                          <span className="te-detail-label">Started</span>
                          <span className="te-detail-val">{new Date(task.started_at).toLocaleTimeString()}</span>
                        </div>
                      )}
                      {task.finished_at && (
                        <div className="te-detail-item">
                          <span className="te-detail-label">Finished</span>
                          <span className="te-detail-val">{new Date(task.finished_at).toLocaleTimeString()}</span>
                        </div>
                      )}
                      {lat !== null && (
                        <div className="te-detail-item">
                          <span className="te-detail-label">Latency</span>
                          <span className="te-detail-val">{lat} ms</span>
                        </div>
                      )}
                      <div className="te-detail-item">
                        <span className="te-detail-label">Status</span>
                        <span className={`te-badge te-badge--${task.status === 'succeeded' || task.status === 'completed' ? 'ok' : task.status === 'failed' ? 'err' : 'neutral'}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>

                    {task.error && (
                      <div className="te-error-block">
                        <span className="te-detail-label">Error</span>
                        <pre className="te-error-text">{task.error}</pre>
                      </div>
                    )}

                    {Object.keys(meta).length > 0 && (
                      <div className="te-metadata">
                        <span className="te-detail-label">Trace metadata</span>
                        <pre className="te-meta-json">{JSON.stringify(meta, null, 2)}</pre>
                      </div>
                    )}

                    {/* Input / output payloads from run level (shown on first node) */}
                    {idx === 0 && run?.input_payload && Object.keys(run.input_payload).length > 0 && (
                      <div className="te-metadata">
                        <span className="te-detail-label">Run input payload</span>
                        <pre className="te-meta-json">{JSON.stringify(run.input_payload, null, 2)}</pre>
                      </div>
                    )}
                    {idx === tasks.length - 1 && run?.output_payload && Object.keys(run.output_payload).length > 0 && (
                      <div className="te-metadata">
                        <span className="te-detail-label">Run output payload</span>
                        <pre className="te-meta-json">{JSON.stringify(run.output_payload, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
