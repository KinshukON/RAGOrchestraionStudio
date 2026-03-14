import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { RAGRunResponse } from '../../api/workflows'
import { listWorkflows, listWorkflowRuns, runWorkflowMulti } from '../../api/workflows'
import { listEnvironments } from '../../api/environments'
import { saveTestCase } from '../../api/evaluations'
import { QueryInputPanel } from './QueryInputPanel'
import { ResultComparisonGrid } from './ResultComparisonGrid'
import { RunHistoryPanel } from './RunHistoryPanel'
import { EmptyState, LoadingMessage } from '../ui/feedback'
import { useToast } from '../ui/ToastContext'
import './query-lab.css'

const DEFAULT_STRATEGIES = ['vector', 'vectorless', 'hybrid']

export function QueryLabPage() {
  const navigate = useNavigate()
  const { success, error } = useToast()
  const [query, setQuery] = useState('')
  const [workflowId, setWorkflowId] = useState('')
  const [environmentId, setEnvironmentId] = useState('dev')
  const [strategies, setStrategies] = useState<string[]>(DEFAULT_STRATEGIES)
  const [topK, setTopK] = useState(10)
  const [workflowFilter, setWorkflowFilter] = useState('')

  const workflowsQuery = useQuery({ queryKey: ['workflows'], queryFn: listWorkflows })
  const environmentsQuery = useQuery({ queryKey: ['environments'], queryFn: listEnvironments })
  const runsQuery = useQuery({ queryKey: ['workflow-runs'], queryFn: listWorkflowRuns, refetchInterval: 5000 })

  const workflows = workflowsQuery.data ?? []
  const environments = environmentsQuery.data ?? []
  const runs = runsQuery.data ?? []

  // Auto-select first available workflow when list loads
  useEffect(() => {
    if (workflows.length > 0 && !workflows.find(w => w.id === workflowId)) {
      setWorkflowId(workflows[0].id)
    }
  }, [workflows])

  const workflowIds = Array.from(new Set(runs.map((r) => r.workflow_id))).sort()

  const simulation = useMutation({
    mutationFn: () =>
      runWorkflowMulti(workflowId, {
        query,
        environment_id: environmentId,
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

  function handleSaveAsTestCase(strategyId: string, trace: RAGRunResponse) {
    saveTestCaseMutation.mutate(
      { strategy_id: strategyId, expected_answer: trace.model_answer },
      {
        onSuccess: () => success('Test case saved — use it later in evaluation runs'),
        onError: () => error('Failed to save test case — please try again'),
      },
    )
  }

  const selectedWorkflow = workflows.find(w => w.id === workflowId)
  const noWorkflows = !workflowsQuery.isLoading && workflows.length === 0

  return (
    <div className="ql-root">
      <header className="ql-header">
        <h1>Query Lab</h1>
        <p>
          Run test queries against workflows, compare strategies side-by-side, and inspect retrieval traces. Uses real LLM connectors when API keys are configured.
        </p>
        {selectedWorkflow && (
          <p className="ql-arch-summary">
            Workflow: <strong>{selectedWorkflow.name}</strong> · Architecture: <strong>{selectedWorkflow.architecture_type}</strong>
          </p>
        )}
      </header>

      {noWorkflows ? (
        <EmptyState
          title="No workflows yet"
          description="Create a workflow in the Workflow Builder or use Generate Workflow from the Guided Designer."
          action={{ label: 'Go to Workflow Builder', onClick: () => navigate('/app/workflow-builder') }}
        />
      ) : (
        <>
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

          {simulation.isPending && !simulation.data && <LoadingMessage label="Running RAG pipeline…" />}

          {!simulation.isPending && !simulation.data && (
            <section className="ql-panel">
              <EmptyState
                title="No results yet"
                description="Select a workflow and click Run to execute a real RAG pipeline. API keys configured in .env enable live LLM + vector retrieval."
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
        </>
      )}
    </div>
  )
}

