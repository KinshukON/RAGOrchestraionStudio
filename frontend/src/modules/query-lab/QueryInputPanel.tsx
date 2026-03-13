import type { WorkflowDefinition } from '../../api/workflows'
import type { EnvironmentConfig } from '../../api/environments'
import './query-lab.css'

const STRATEGY_OPTIONS = [
  { id: 'vector', label: 'Vector' },
  { id: 'vectorless', label: 'Vectorless' },
  { id: 'graph', label: 'Graph' },
  { id: 'temporal', label: 'Temporal' },
  { id: 'hybrid', label: 'Hybrid' },
]

type QueryInputPanelProps = {
  query: string
  setQuery: (v: string) => void
  workflowId: string
  setWorkflowId: (v: string) => void
  environmentId: string
  setEnvironmentId: (v: string) => void
  strategies: string[]
  setStrategies: (v: string[]) => void
  topK: number
  setTopK: (v: number) => void
  onRun: () => void
  isRunning: boolean
  workflows: WorkflowDefinition[]
  environments: EnvironmentConfig[]
  workflowsLoading: boolean
  environmentsLoading: boolean
}

export function QueryInputPanel({
  query,
  setQuery,
  workflowId,
  setWorkflowId,
  environmentId,
  setEnvironmentId,
  strategies,
  setStrategies,
  topK,
  setTopK,
  onRun,
  isRunning,
  workflows,
  environments,
  workflowsLoading,
  environmentsLoading,
}: QueryInputPanelProps) {
  function toggleStrategy(id: string) {
    if (strategies.includes(id)) {
      setStrategies(strategies.filter((s) => s !== id))
    } else {
      setStrategies([...strategies, id])
    }
  }

  return (
    <section className="ql-panel ql-input-panel">
      <h2>Query</h2>
      <form
        className="ql-form"
        onSubmit={(e) => {
          e.preventDefault()
          onRun()
        }}
      >
        <label className="ql-field">
          <span>Workflow</span>
          {workflows.length === 0 && !workflowsLoading ? (
            <input
              type="text"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              placeholder="e.g. demo-workflow (create in Workflow Builder)"
              className="ql-input"
              aria-label="Workflow ID"
            />
          ) : (
            <select
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              disabled={workflowsLoading}
              aria-label="Select workflow"
            >
              {workflowsLoading && <option value="">Loading…</option>}
              {!workflowsLoading && workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.architecture_type})
                </option>
              ))}
              {!workflowsLoading && workflows.length > 0 && !workflows.some((w) => w.id === workflowId) && (
                <option value={workflowId}>{workflowId}</option>
              )}
            </select>
          )}
        </label>
        <label className="ql-field">
          <span>Environment</span>
          <select
            value={environmentId}
            onChange={(e) => setEnvironmentId(e.target.value)}
            disabled={environmentsLoading}
            aria-label="Select environment"
          >
            {environments.length === 0 && <option value="dev">dev (default)</option>}
            {environments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
            {environments.length > 0 && !environments.some((e) => e.id === environmentId) && (
              <option value={environmentId}>{environmentId}</option>
            )}
          </select>
        </label>
        <label className="ql-field">
          <span>Query text</span>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
            placeholder="Enter a test question or instruction..."
            className="ql-textarea"
            aria-label="Query text"
          />
        </label>
        <div className="ql-field">
          <span>Strategies to compare</span>
          <div className="ql-strategies">
            {STRATEGY_OPTIONS.map((opt) => (
              <label key={opt.id} className="ql-checkbox">
                <input
                  type="checkbox"
                  checked={strategies.includes(opt.id)}
                  onChange={() => toggleStrategy(opt.id)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <label className="ql-field">
          <span>Top-k (retrieval hint)</span>
          <input
            type="number"
            min={1}
            max={100}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value) || 10)}
            className="ql-input ql-input--narrow"
          />
        </label>
        <div className="ql-actions">
          <button type="submit" className="ql-btn ql-btn--primary" disabled={isRunning} aria-label="Run simulation">
            {isRunning ? 'Running…' : 'Run simulation'}
          </button>
          <span className="ql-hint">Backend returns simulated traces. No real retrieval or LLM calls.</span>
        </div>
      </form>
    </section>
  )
}
