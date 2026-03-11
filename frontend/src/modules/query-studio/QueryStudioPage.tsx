import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { simulateWorkflowMulti } from '../../api/queryStudio'
import { TracePanels } from './TracePanels'
import { EmptyState, LoadingMessage } from '../ui/feedback'

const DEFAULT_STRATEGIES = ['vector', 'vectorless', 'hybrid']

export function QueryStudioPage() {
  const [query, setQuery] = useState('')
  const [workflowId, setWorkflowId] = useState('demo-workflow')
  const [strategies, setStrategies] = useState<string[]>(DEFAULT_STRATEGIES)
  const [topK, setTopK] = useState(10)

  const simulation = useMutation({
    mutationFn: () =>
      simulateWorkflowMulti(workflowId, {
        project_id: 'demo-project',
        environment_id: 'dev',
        query,
        strategies,
        parameters: { top_k: topK },
      }),
  })

  return (
    <div>
      <h1>Query Studio</h1>
      <p>Run test queries, inspect retrieval traces, and compare strategies from here.</p>
      <form
        style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem', maxWidth: '720px' }}
        onSubmit={(e) => {
          e.preventDefault()
          simulation.mutate()
        }}
      >
        <label>
          Workflow ID
          <input
            type="text"
            value={workflowId}
            onChange={(e) => setWorkflowId(e.target.value)}
            style={{ display: 'block', marginTop: '0.25rem', width: '320px' }}
          />
        </label>
        <label>
          Query
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
            style={{ display: 'block', marginTop: '0.25rem', width: '100%' }}
          />
        </label>
        <label>
          Strategies (comma separated)
          <input
            type="text"
            value={strategies.join(',')}
            onChange={(e) => setStrategies(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          />
        </label>
        <label>
          Top-k (hint to retrievers)
          <input
            type="number"
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value) || 0)}
            style={{ width: '120px' }}
          />
        </label>
        <button type="submit" disabled={simulation.isLoading} aria-label="Run query simulation">
          {simulation.isLoading ? 'Running...' : 'Run Multi-Strategy Simulation'}
        </button>
      </form>

      {simulation.isLoading && !simulation.data && <LoadingMessage label="Running simulation..." />}

      {!simulation.isLoading && !simulation.data && (
        <div style={{ marginTop: '1.5rem' }}>
          <EmptyState
            title="No results yet"
            description="Run a simulation to see answers, traces, and strategy comparisons."
          />
        </div>
      )}

      {simulation.data && (
        <section style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {simulation.data.results.map(({ strategy_id, trace }) => (
            <article
              key={strategy_id}
              style={{
                borderRadius: '0.75rem',
                border: '1px solid #1f2937',
                padding: '0.9rem 1rem',
                background: 'rgba(15,23,42,0.9)',
              }}
            >
              <h2 style={{ fontSize: '0.95rem', marginTop: 0 }}>{strategy_id}</h2>
              <p style={{ fontSize: '0.85rem' }}>
                <strong>Answer:</strong> {trace.model_answer}
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                <strong>Latency:</strong> {trace.latency_ms} ms
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                <strong>Confidence:</strong> {Math.round(trace.confidence_score * 100)}%
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                <strong>Hallucination risk:</strong> {trace.hallucination_risk}
              </p>
              <TracePanels trace={trace} />
            </article>
          ))}
        </section>
      )}
    </div>
  )
}



