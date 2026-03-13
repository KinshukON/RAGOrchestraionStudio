import type { WorkflowRunSummary } from '../../api/workflowRuns'
import './query-lab.css'

type RunHistoryPanelProps = {
  runs: WorkflowRunSummary[]
  isLoading: boolean
  workflowFilter: string
  setWorkflowFilter: (v: string) => void
  workflowIds: string[]
}

export function RunHistoryPanel({
  runs,
  isLoading,
  workflowFilter,
  setWorkflowFilter,
  workflowIds,
}: RunHistoryPanelProps) {
  const filtered = workflowFilter
    ? runs.filter((r) => r.workflow_id === workflowFilter)
    : runs

  return (
    <section className="ql-panel ql-history-panel">
      <h2>Run history</h2>
      {workflowIds.length > 0 && (
        <label className="ql-field ql-field--inline">
          <span>Workflow</span>
          <select
            value={workflowFilter}
            onChange={(e) => setWorkflowFilter(e.target.value)}
            aria-label="Filter by workflow"
          >
            <option value="">All</option>
            {workflowIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      )}
      {isLoading && <p className="ql-muted">Loading runs…</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="ql-muted">No runs yet. Run a simulation to record history.</p>
      )}
      {!isLoading && filtered.length > 0 && (
        <div className="ql-table-wrap">
          <table className="ql-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Workflow</th>
                <th>Status</th>
                <th>Created</th>
                <th>Finished</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((run) => (
                <tr key={run.id}>
                  <td>{run.id}</td>
                  <td>{run.workflow_id}</td>
                  <td><span className={`ql-status ql-status--${run.status}`}>{run.status}</span></td>
                  <td>{new Date(run.created_at).toLocaleString()}</td>
                  <td>{run.finished_at ? new Date(run.finished_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
