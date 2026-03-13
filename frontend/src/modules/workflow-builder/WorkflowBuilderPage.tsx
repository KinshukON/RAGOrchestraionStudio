import { useMemo, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import type { Edge, Node } from 'reactflow'
import { NodePalette } from './NodePalette'
import { WorkflowCanvas } from './WorkflowCanvas'
import { ArchitectureSummaryPanel } from './ArchitectureSummaryPanel'
import { NodeConfigPanel, type NodeUpdatePatch } from './NodeConfigPanel'
import { reactFlowToWorkflowDefinition, workflowDefinitionToReactFlow, type WorkflowMeta } from './modelMapping'
import { useSaveWorkflow } from './useWorkflowApi'
import { workflowTemplates, type WorkflowTemplateId } from './workflowTemplates'

const RETRIEVAL_NODE_TYPES = new Set(['vector_retriever', 'lexical_retriever', 'graph_retriever', 'metadata_filter', 'sql_retriever'])
const ANSWER_NODE_TYPES = new Set(['llm_answer_generator'])

export function WorkflowBuilderPage() {
  const location = useLocation()
  const search = new URLSearchParams(location.search)
  const templateId = search.get('template') as WorkflowTemplateId | null

  const templateDefinition = templateId ? workflowTemplates[templateId] : undefined

  const initialNodes: Node[] = useMemo(
    () => {
      if (templateDefinition) {
        const { nodes } = workflowDefinitionToReactFlow(templateDefinition)
        if (nodes.length > 0) return nodes
      }
      return [
        { id: 'n1', data: { label: 'User Query', type: 'input_query' }, position: { x: 50, y: 120 } },
        { id: 'n2', data: { label: 'Intent Classifier', type: 'query_classifier' }, position: { x: 280, y: 120 } },
        { id: 'n3', data: { label: 'Vector Retriever', type: 'vector_retriever' }, position: { x: 520, y: 80 } },
      ]
    },
    [templateDefinition],
  )

  const initialEdges: Edge[] = useMemo(
    () => {
      if (templateDefinition) {
        const { edges } = workflowDefinitionToReactFlow(templateDefinition)
        if (edges.length > 0) return edges
      }
      return [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
      ]
    },
    [templateDefinition],
  )

  const [graphNodes, setGraphNodes] = useState<Node[]>(initialNodes)
  const [graphEdges, setGraphEdges] = useState<Edge[]>(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  useEffect(() => {
    setGraphNodes(initialNodes)
    setGraphEdges(initialEdges)
    setSelectedNodeId(null)
  }, [templateId])

  const [meta, setMeta] = useState<WorkflowMeta>({
    id: 'demo-workflow',
    project_id: 'demo-project',
    name: templateDefinition?.name ?? 'Demo Hybrid RAG Workflow',
    description: templateDefinition?.description ?? 'Example workflow illustrating RAG Studio builder.',
    version: '1.0.0',
    architecture_type: templateDefinition?.architecture_type ?? 'hybrid',
    is_active: false,
  })

  useEffect(() => {
    if (templateDefinition) {
      setMeta((m) => ({
        ...m,
        name: templateDefinition.name,
        description: templateDefinition.description,
        architecture_type: templateDefinition.architecture_type,
      }))
    }
  }, [templateDefinition])

  const saveWorkflow = useSaveWorkflow()

  function handleSave(isActive: boolean) {
    const definition = reactFlowToWorkflowDefinition(graphNodes, graphEdges, {
      ...meta,
      is_active: isActive,
    })
    saveWorkflow.mutate(definition)
  }

  function handleNodeUpdate(nodeId: string, patch: NodeUpdatePatch) {
    setGraphNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n
        const next = { ...n, data: { ...n.data } }
        if (patch.label != null) next.data!.label = patch.label
        if (patch.config != null) next.data!.config = patch.config
        return next
      }),
    )
  }

  const selectedNode = selectedNodeId ? graphNodes.find((n) => n.id === selectedNodeId) ?? null : null

  const hasRetrieval = graphNodes.some((n) => RETRIEVAL_NODE_TYPES.has((n.data?.type as string) ?? ''))
  const hasAnswer = graphNodes.some((n) => ANSWER_NODE_TYPES.has((n.data?.type as string) ?? ''))
  const validationWarnings: string[] = []
  if (!hasRetrieval) validationWarnings.push('Add at least one retrieval node (e.g. vector, lexical, or graph retriever).')
  if (!hasAnswer) validationWarnings.push('Add an answer generation node to produce the final response.')

  const statusLabel = meta.is_active ? 'Active' : 'Draft'

  return (
    <div className="wf-layout">
      <div className="wf-header">
        <div>
          <h1>Workflow Builder</h1>
          <p>Design RAG workflows as node-based graphs. Choose a template or build from scratch.</p>
          <ArchitectureSummaryPanel meta={meta} />
        </div>
        <div className="wf-header-actions">
          <span className="wf-status-badge">{statusLabel}</span>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saveWorkflow.isPending}
          >
            {saveWorkflow.isPending ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saveWorkflow.isPending}
          >
            {saveWorkflow.isPending ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
      {validationWarnings.length > 0 && (
        <div className="wf-validation-banner" role="alert">
          {validationWarnings.join(' ')}
        </div>
      )}
      <div className="wf-body">
        <NodePalette />
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
        <NodeConfigPanel node={selectedNode} onNodeUpdate={handleNodeUpdate} />
      </div>
    </div>
  )
}


