import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { WorkflowSimulationTrace } from '../../api/queryStudio'
import { listWorkflows } from '../../api/workflows'
import { listWorkflowRuns } from '../../api/workflowRuns'
import { listEnvironments } from '../../api/environments'
import { simulateWorkflowMulti } from '../../api/queryStudio'
import { saveTestCase } from '../../api/evaluations'
import { QueryInputPanel } from './QueryInputPanel'
import { ResultComparisonGrid } from './ResultComparisonGrid'
import { RunHistoryPanel } from './RunHistoryPanel'
import { EmptyState, LoadingMessage } from '../ui/feedback'
import './query-lab.css'

const DEFAULT_STRATEGIES = ['vector', 'vectorless', 'hybrid']

export function QueryLabPage() {
  const [query, setQuery] = useState('')
  const [workflowId, setWorkflowId] = useState('demo-workflow')
  const [environmentId, setEnvironmentId] = useState('dev')
  const [strategies, setStrategies] = useState<string[]>(DEFAULT_STRATEGIES)
  const [topK, setTopK] = useState(10)
  const [workflowFilter, setWorkflowFilter] = useState('')

  const workflowsQuery = useQuery({ queryKey: ['workflows'], queryFn: listWorkflows })
  const environmentsQuery = useQuery({ queryKey: ['environments'], queryFn: listEnvironments })
  const runsQuery = useQuery({ queryKey: ['workflow-runs'], queryFn: listWorkflowRuns })

  const workflows = workflowsQuery.data ?? []
  const environments = environmentsQuery.data ?? []
  const runs = runsQuery.data ?? []

  const workflowIds = Array.from(new Set(runs.map((r) => r.workflow_id))).sort()

  const simulation = useMutation({
    mutationFn: () =>
      simulateWorkflowMulti(workflowId, {
        project_id: 'demo-project',
        environment_id: environmentId,
        query,
        strategies: strategies.length > 0 ? strategies : DEFAULT_STRATEGIES,
        parameters: { top_k: topK },
      }),
    onSuccess: () => {
      runsQuery.refetch()
    },
  })

  const saveTestCaseMutation = useMutation({
    mutationFn: (payload: {
      strategy_id: string
      expected_answer: string
    }) =>
      saveTestCase({
        workflow_id: workflowId,
        environment_id: environmentId,
        query,
        strategy_id: payload.strategy_id,
        expected_answer: payload.expected_answer || undefined,
        parameters: { top_k: topK },
      }),
  })

  function handleSaveAsTestCase(strategyId: string, trace: WorkflowSimulationTrace) {
    saveTestCaseMutation.mutate(
      { strategy_id: strategyId, expected_answer: trace.model_answer },
      {
        onSuccess: () => {
          if (typeof window !== 'undefined') {
            window.alert('Test case saved. You can use it later for evaluation runs.')
          }
        },
        onError: () => {
          if (typeof window !== 'undefined') {
            window.alert('Failed to save test case. Please try again.')
          }
        },
      }
    )
  }

  const selectedWorkflow = workflows.find((w) => w.id === workflowId)

  return (
    <div className="ql-root">
      <header className="ql-header">
        <h1>Query Lab</h1>
        <p>
          Run test queries against workflows, compare strategies, and inspect retrieval traces. Results are simulated until real execution is connected.
        </p>
        {selectedWorkflow && (
          <p className="ql-arch-summary">
            Workflow: <strong>{selectedWorkflow.name}</strong> · Architecture: <strong>{selectedWorkflow.architecture_type}</strong>
          </p>
        )}
      </header>

      <QueryInputPanel
        query={query}
        setQuery={setQuery}
        workflowId={workflowId}
        setWorkflowId={setWorkflowId}
        environmentId={environmentId}
        setEnvironmentId={setEnvironmentId}
        strategies={strategies}
        setStrategies={setStrategies}
        topK={topK}
        setTopK={setTopK}
        onRun={() => simulation.mutate()}
        isRunning={simulation.isPending}
        workflows={workflows}
        environments={environments}
        workflowsLoading={workflowsQuery.isLoading}
        environmentsLoading={environmentsQuery.isLoading}
      />

      {simulation.isPending && !simulation.data && <LoadingMessage label="Running simulation…" />}

      {!simulation.isPending && !simulation.data && (
        <section className="ql-panel">
          <EmptyState
            title="No results yet"
            description="Select a workflow and run a simulation to see answers, metrics, and strategy comparisons."
          />
        </section>
      )}

      {simulation.data && simulation.data.results.length > 0 && (
        <ResultComparisonGrid
          results={simulation.data.results}
          onSaveAsTestCase={handleSaveAsTestCase}
        />
      )}

      <RunHistoryPanel
        runs={runs}
        isLoading={runsQuery.isLoading}
        workflowFilter={workflowFilter}
        setWorkflowFilter={setWorkflowFilter}
        workflowIds={workflowIds}
      />
    </div>
  )
}
