import { useMemo, useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { useHasPermission } from '../auth/AuthContext'
import type { Edge, Node } from 'reactflow'
import { NodePalette } from './NodePalette'
import { WorkflowCanvas } from './WorkflowCanvas'
import { ArchitectureSummaryPanel } from './ArchitectureSummaryPanel'
import { NodeConfigPanel, type NodeUpdatePatch } from './NodeConfigPanel'
import { reactFlowToWorkflowDefinition, workflowDefinitionToReactFlow, type WorkflowMeta } from './modelMapping'
import { useSaveWorkflow, useWorkflow } from './useWorkflowApi'
import { workflowTemplates, type WorkflowTemplateId } from './workflowTemplates'
import { useToast } from '../ui/ToastContext'
import { SkeletonBar } from '../ui/Skeleton'
import { publishWorkflow, updateWorkflow, createWorkflow, type PublishGateResult } from '../../api/workflows'

const RETRIEVAL_NODE_TYPES = new Set(['vector_retriever', 'lexical_retriever', 'graph_retriever', 'metadata_filter', 'sql_retriever'])
const ANSWER_NODE_TYPES = new Set(['llm_answer_generator'])

function genId(): string {
  return `wf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

const DEFAULT_NODES: Node[] = [
  { id: 'n1', data: { label: 'User Query', type: 'input_query' }, position: { x: 50, y: 120 } },
  { id: 'n2', data: { label: 'Intent Classifier', type: 'query_classifier' }, position: { x: 280, y: 120 } },
  { id: 'n3', data: { label: 'Vector Retriever', type: 'vector_retriever' }, position: { x: 520, y: 80 } },
]
const DEFAULT_EDGES: Edge[] = [
  { id: 'e1', source: 'n1', target: 'n2' },
  { id: 'e2', source: 'n2', target: 'n3' },
]

export function WorkflowBuilderPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { success, error } = useToast()

  const search = new URLSearchParams(location.search)
  const templateId = search.get('template') as WorkflowTemplateId | null
  const workflowId = search.get('workflowId')

  // ── Remote workflow (when arriving from Designer "Generate Workflow") ─────
  const remoteWorkflowQuery = useWorkflow(workflowId)

  // ── Template (when arriving from Catalog "Use template") ─────────────────
  const templateDefinition = templateId ? workflowTemplates[templateId] : undefined

  // ── Derive initial nodes / edges ─────────────────────────────────────────
  const initialNodes: Node[] = useMemo(() => {
    if (remoteWorkflowQuery.data) {
      const { nodes } = workflowDefinitionToReactFlow(remoteWorkflowQuery.data)
      if (nodes.length > 0) return nodes
    }
    if (templateDefinition) {
      const { nodes } = workflowDefinitionToReactFlow(templateDefinition)
      if (nodes.length > 0) return nodes
    }
    return DEFAULT_NODES
  }, [remoteWorkflowQuery.data, templateDefinition])

  const initialEdges: Edge[] = useMemo(() => {
    if (remoteWorkflowQuery.data) {
      const { edges } = workflowDefinitionToReactFlow(remoteWorkflowQuery.data)
      if (edges.length > 0) return edges
    }
    if (templateDefinition) {
      const { edges } = workflowDefinitionToReactFlow(templateDefinition)
      if (edges.length > 0) return edges
    }
    return DEFAULT_EDGES
  }, [remoteWorkflowQuery.data, templateDefinition])

  const [graphNodes, setGraphNodes] = useState<Node[]>(initialNodes)
  const [graphEdges, setGraphEdges] = useState<Edge[]>(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Re-sync whenever a remote workflow finishes loading or template changes
  useEffect(() => {
    setGraphNodes(initialNodes)
    setGraphEdges(initialEdges)
    setSelectedNodeId(null)
  }, [remoteWorkflowQuery.data, templateId])

  // ── Meta (name, id, arch type, …) ─────────────────────────────────────────
  const [meta, setMeta] = useState<WorkflowMeta>(() => ({
    id: workflowId ?? genId(),
    project_id: 'default',
    name: 'New RAG Workflow',
    description: 'Design your RAG pipeline by dragging nodes onto the canvas.',
    version: '1.0.0',
    architecture_type: 'hybrid',
    is_active: false,
  }))

  // Override meta when remote workflow loads
  useEffect(() => {
    if (remoteWorkflowQuery.data) {
      const wf = remoteWorkflowQuery.data
      setMeta({
        id: wf.id,
        project_id: wf.project_id,
        name: wf.name,
        description: wf.description,
        version: wf.version,
        architecture_type: wf.architecture_type,
        is_active: wf.is_active,
      })
    }
  }, [remoteWorkflowQuery.data])

  // Override meta when template changes
  useEffect(() => {
    if (templateDefinition) {
      setMeta(m => ({
        ...m,
        id: genId(),
        name: templateDefinition.name,
        description: templateDefinition.description,
        architecture_type: templateDefinition.architecture_type,
        is_active: false,
      }))
    }
  }, [templateDefinition])

  // ── Save / Publish ─────────────────────────────────────────────────────────
  const saveWorkflow = useSaveWorkflow()
  const [govResult, setGovResult] = useState<PublishGateResult | null>(null)

  const publishMutation = useMutation({
    mutationFn: async (): Promise<PublishGateResult> => {
      const definition = reactFlowToWorkflowDefinition(graphNodes, graphEdges, { ...meta, is_active: false })
      let savedId = meta.id
      try {
        const saved = meta.id
          ? await updateWorkflow(meta.id, definition)
          : await createWorkflow(definition)
        savedId = saved.id
        setMeta(m => ({ ...m, id: saved.id }))
        navigate(`/app/workflow-builder?workflowId=${saved.id}`, { replace: true })
      } catch {
        // continue with existing id if save fails
      }
      return publishWorkflow(savedId)
    },
    onSuccess: (gate: PublishGateResult) => {
      setGovResult(gate)
      if (gate.published) {
        setMeta(m => ({ ...m, is_active: true }))
        const pct = gate.confidence_score !== null ? Math.round(gate.confidence_score * 100) + '%' : 'N/A'
        success(`Workflow published ✓  confidence ${pct}`)
      }
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      error(detail || 'Failed to contact governance service')
    },
  })

  function handleSave(isActive: boolean) {
    if (isActive) {
      setGovResult(null)
      publishMutation.mutate()
      return
    }
    const definition = reactFlowToWorkflowDefinition(graphNodes, graphEdges, { ...meta, is_active: false })
    saveWorkflow.mutate(definition, {
      onSuccess: (saved) => {
        success(`Workflow "${saved.name}" saved as draft`)
        setMeta(m => ({ ...m, id: saved.id, is_active: saved.is_active }))
        navigate(`/app/workflow-builder?workflowId=${saved.id}`, { replace: true })
      },
      onError: () => error('Failed to save workflow'),
    })
  }


  // ── Node editing ───────────────────────────────────────────────────────────
  function handleNodeUpdate(nodeId: string, patch: NodeUpdatePatch) {
    setGraphNodes(prev =>
      prev.map(n => {
        if (n.id !== nodeId) return n
        const next = { ...n, data: { ...n.data } }
        if (patch.label != null) next.data!.label = patch.label
        if (patch.config != null) next.data!.config = patch.config
        return next
      }),
    )
  }

  const selectedNode = selectedNodeId ? graphNodes.find(n => n.id === selectedNodeId) ?? null : null

  const hasRetrieval = graphNodes.some(n => RETRIEVAL_NODE_TYPES.has((n.data?.type as string) ?? ''))
  const hasAnswer = graphNodes.some(n => ANSWER_NODE_TYPES.has((n.data?.type as string) ?? ''))
  const canPublish = useHasPermission('publish_workflows')
  const validationWarnings: string[] = []
  if (!hasRetrieval) validationWarnings.push('Add at least one retrieval node (e.g. vector, lexical, or graph retriever).')
  if (!hasAnswer) validationWarnings.push('Add an answer generation node to produce the final response.')

  const statusLabel = meta.is_active ? 'Active' : 'Draft'
  const isLoading = !!workflowId && remoteWorkflowQuery.isLoading

  return (
    <div className="wf-layout">
      <div className="wf-header">
        <div>
          <h1>Workflow Builder</h1>
          <p>Design RAG workflows as node-based graphs. Choose a template or build from scratch.</p>
          {isLoading ? (
            <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', marginTop: '.5rem' }}>
              <SkeletonBar width="220px" height="1rem" />
            </div>
          ) : (
            <ArchitectureSummaryPanel meta={meta} />
          )}
        </div>
        <div className="wf-header-actions">
          <span className="wf-status-badge">{statusLabel}</span>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saveWorkflow.isPending || publishMutation.isPending || isLoading}
          >
            {saveWorkflow.isPending ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            type="button"
            className="wf-publish-btn"
            onClick={() => handleSave(true)}
            disabled={saveWorkflow.isPending || publishMutation.isPending || isLoading || !canPublish}
            title={!canPublish ? 'Requires publish_workflows permission (AI Architect or Platform Admin role)' : undefined}
          >
            {publishMutation.isPending ? 'Checking governance…' : 'Publish'}
          </button>
        </div>
      </div>
      {validationWarnings.length > 0 && (
        <div className="wf-validation-banner" role="alert">
          {validationWarnings.join(' ')}
        </div>
      )}
      {govResult && !govResult.published && govResult.violations.length > 0 && (
        <div className="wf-gov-banner wf-gov-banner--blocked" role="alert">
          <strong>⛔ Governance policy blocked publish</strong>
          {govResult.policy_name && <span className="wf-gov-policy-name">{govResult.policy_name}</span>}
          <ul className="wf-gov-violations">
            {govResult.violations.map((v, i) => <li key={i}>{v}</li>)}
          </ul>
          {govResult.run_count === 0 && (
            <p className="wf-gov-hint">Run the workflow from the Evaluation Harness to generate a confidence score, then try publishing again.</p>
          )}
        </div>
      )}
      {govResult?.warnings && govResult.warnings.length > 0 && (
        <div className="wf-gov-banner wf-gov-banner--warn" role="alert">
          ⚠ {govResult.warnings.join(' ')}
        </div>
      )}
      <div className="wf-body">
        <NodePalette />
        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', color: 'var(--muted)' }}>
            <SkeletonBar width="60%" height="1.2rem" />
            <SkeletonBar width="40%" height="1.2rem" />
            <p style={{ fontSize: '.85rem', marginTop: '1rem' }}>Loading workflow…</p>
          </div>
        ) : (
          <WorkflowCanvas
            initialNodes={initialNodes}
            initialEdges={initialEdges}
            nodes={graphNodes}
            edges={graphEdges}
            onGraphChange={(nodes, edges) => {
              setGraphNodes(nodes)
              setGraphEdges(edges)
            }}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          />
        )}
        <NodeConfigPanel node={selectedNode} onNodeUpdate={handleNodeUpdate} />
      </div>
    </div>
  )
}
