import type { Edge, Node } from 'reactflow'
import type { WorkflowDefinition, WorkflowEdge, WorkflowNode } from '../../api/workflows'

export type WorkflowMeta = {
  id: string
  project_id: string
  name: string
  description: string
  version: string
  architecture_type: string
  is_active: boolean
}

export function reactFlowToWorkflowDefinition(
  nodes: Node[],
  edges: Edge[],
  meta: WorkflowMeta,
): WorkflowDefinition {
  const wfNodes: WorkflowNode[] = nodes.map((n) => ({
    id: n.id,
    type: (n.data?.type as WorkflowNode['type']) ?? 'input_query',
    name: (n.data?.label as string) ?? n.id,
    config: (n.data?.config as Record<string, unknown>) ?? {},
    position: {
      x: n.position.x,
      y: n.position.y,
    },
  }))

  const wfEdges: WorkflowEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    condition: (e.data?.condition as string | undefined) ?? null,
  }))

  return {
    ...meta,
    nodes: wfNodes,
    edges: wfEdges,
  }
}

export function workflowDefinitionToReactFlow(
  definition: WorkflowDefinition,
): {
  nodes: Node[]
  edges: Edge[]
  meta: WorkflowMeta
} {
  const nodes: Node[] = definition.nodes.map((n) => ({
    id: n.id,
    data: {
      label: n.name,
      type: n.type,
      config: n.config,
    },
    position: {
      x: n.position.x,
      y: n.position.y,
    },
  }))

  const edges: Edge[] = definition.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    data: {
      condition: e.condition ?? undefined,
    },
  }))

  const { id, project_id, name, description, version, architecture_type, is_active } = definition

  return {
    nodes,
    edges,
    meta: {
      id,
      project_id,
      name,
      description,
      version,
      architecture_type,
      is_active,
    },
  }
}

