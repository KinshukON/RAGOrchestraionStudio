import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { Edge, Node } from 'reactflow'
import { NodePalette } from './NodePalette'
import { WorkflowCanvas } from './WorkflowCanvas'
import { reactFlowToWorkflowDefinition, workflowDefinitionToReactFlow, type WorkflowMeta } from './modelMapping'
import { useSaveWorkflow } from './useWorkflowApi'
import { workflowTemplates, type WorkflowTemplateId } from './workflowTemplates'
import { EmptyState, LoadingMessage } from '../ui/feedback'

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
        {
          id: 'n1',
          data: { label: 'User Query' },
          position: { x: 50, y: 120 },
        },
        {
          id: 'n2',
          data: { label: 'Intent Classifier' },
          position: { x: 280, y: 120 },
        },
        {
          id: 'n3',
          data: { label: 'Vector Retriever' },
          position: { x: 520, y: 80 },
        },
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

  const [meta] = useState<WorkflowMeta>({
    id: 'demo-workflow',
    project_id: 'demo-project',
    name: 'Demo Hybrid RAG Workflow',
    description: 'Example workflow illustrating RAG Studio builder.',
    version: '1.0.0',
    architecture_type: 'hybrid',
    is_active: false,
  })

  const saveWorkflow = useSaveWorkflow()

  function handleSave(isActive: boolean) {
    const definition = reactFlowToWorkflowDefinition(graphNodes, graphEdges, {
      ...meta,
      is_active: isActive,
    })
    saveWorkflow.mutate(definition)
  }

  const statusLabel = meta.is_active ? 'Active' : 'Draft'

  return (
    <div className="wf-layout">
      <div className="wf-header">
        <div>
          <h1>Workflow Builder</h1>
          <p>Design hybrid RAG workflows as node-based graphs.</p>
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
      <div className="wf-body">
        <NodePalette />
        <WorkflowCanvas
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          onGraphChange={(nodes, edges) => {
            setGraphNodes(nodes)
            setGraphEdges(edges)
          }}
        />
        <aside className="wf-config-panel">
          <h2>Configuration</h2>
          <p>Select a node to configure its behavior.</p>
        </aside>
      </div>
    </div>
  )
}


