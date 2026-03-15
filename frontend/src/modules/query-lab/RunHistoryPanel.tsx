import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listWorkflowRuns } from '../../api/workflowRuns'
import type { WorkflowRunSummary } from '../../api/workflowRuns'
import './query-lab.css'

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'succeeded' ? 'ql-badge--live' : status === 'failed' ? 'ql-badge--fail' : 'ql-badge--pending'
  return <span className={`ql-badge ${cls}`}>{status}</span>
}

function RelativeTime({ iso }: { iso: string }) {
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return <>{diff}s ago</>
  if (diff < 3600) return <>{Math.floor(diff / 60)}m ago</>
  return <>{d.toLocaleString()}</>
}

function ExpandedRow({ run }: { run: WorkflowRunSummary }) {
  return (
    <tr className="ql-run-detail-row">
      <td colSpan={7} className="ql-run-detail-cell">
        <div className="ql-run-detail">
          {run.experiment_id && (
            <div className="ql-run-detail-item">
              <span className="ql-run-detail-label">Experiment ID</span>
              <code className="ql-run-detail-value ql-monospace">{run.experiment_id}</code>
            </div>
          )}
          {run.query && (
            <div className="ql-run-detail-item">
              <span className="ql-run-detail-label">Query</span>
              <span className="ql-run-detail-value">{run.query}</span>
            </div>
          )}
          {run.strategies_run && run.strategies_run.length > 0 && (
            <div className="ql-run-detail-item">
              <span className="ql-run-detail-label">Strategies</span>
              <div className="ql-run-detail-value">
                {run.strategies_run.map((s, i) => (
                  <span key={i} className="ql-path-pill" style={{ marginRight: 4 }}>{s}</span>
                ))}
              </div>
            </div>
          )}
          {run.architecture_type && (
            <div className="ql-run-detail-item">
              <span className="ql-run-detail-label">Architecture</span>
              <span className="ql-run-detail-value ql-monospace">{run.architecture_type}</span>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

function downloadCsv(runs: WorkflowRunSummary[]) {
  const cols = ['id', 'workflow_id', 'status', 'experiment_id', 'query', 'architecture_type', 'strategies', 'created_at', 'finished_at']
  const rows = [cols, ...runs.map(r => [
    String(r.id),
    r.workflow_id,
    r.status,
    r.experiment_id ?? '',
    `"${(r.query ?? '').replace(/"/g, '""')}"`,
    r.architecture_type ?? '',
    (r.strategies_run ?? []).join('|'),
    r.created_at,
    r.finished_at ?? '',
  ])]
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'run-history.csv'; a.click()
  URL.revokeObjectURL(url)
}

export function RunHistoryPanel() {
  const runsQuery = useQuery({ queryKey: ['workflow-runs'], queryFn: listWorkflowRuns })
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const runs = (runsQuery.data ?? []).filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      (r.experiment_id?.toLowerCase().includes(s)) ||
      (r.query?.toLowerCase().includes(s)) ||
      r.status.includes(s)
    )
  })

  return (
    <section className="ql-panel ql-history-panel">
      <div className="ql-history-header">
        <h2>Run History</h2>
        <div className="ql-history-actions">
          <input
            className="ql-search-input"
            placeholder="Search by query or experiment ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            type="button"
            className="ql-btn ql-btn--ghost ql-btn--small"
            onClick={() => downloadCsv(runs)}
            disabled={runs.length === 0}
          >
            ↓ CSV
          </button>
          <button
            type="button"
            className="ql-btn ql-btn--ghost ql-btn--small"
            onClick={() => runsQuery.refetch()}
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {runsQuery.isLoading ? (
        <p className="ql-loading">Loading run history…</p>
      ) : runs.length === 0 ? (
        <p className="ql-empty">No runs yet. Run a query in the panel above.</p>
      ) : (
        <div className="ql-table-wrap">
          <table className="ql-runs-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Experiment ID</th>
                <th>Query</th>
                <th>Status</th>
                <th>Strategies</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => [
                <tr
                  key={run.id}
                  className={`ql-run-row ${expandedId === run.id ? 'ql-run-row--expanded' : ''}`}
                  onClick={() => setExpandedId(id => id === run.id ? null : run.id)}
                >
                  <td className="ql-run-id">{run.id}</td>
                  <td className="ql-exp-id-cell">
                    {run.experiment_id
                      ? <code className="ql-monospace ql-exp-id-small">{run.experiment_id}</code>
                      : <span className="ql-muted">—</span>
                    }
                  </td>
                  <td className="ql-query-cell" title={run.query ?? ''}>
                    {run.query ? run.query.slice(0, 55) + (run.query.length > 55 ? '…' : '') : '—'}
                  </td>
                  <td><StatusBadge status={run.status} /></td>
                  <td>
                    {(run.strategies_run ?? []).length > 0
                      ? <span className="ql-muted">{(run.strategies_run ?? []).join(', ')}</span>
                      : <span className="ql-muted">—</span>
                    }
                  </td>
                  <td className="ql-muted ql-time-cell">
                    <RelativeTime iso={run.created_at} />
                  </td>
                  <td className="ql-expand-cell">{expandedId === run.id ? '▲' : '▼'}</td>
                </tr>,
                expandedId === run.id && <ExpandedRow key={`${run.id}-detail`} run={run} />,
              ])}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
