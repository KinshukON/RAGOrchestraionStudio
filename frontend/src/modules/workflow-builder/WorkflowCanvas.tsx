import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
  type Connection,
  addEdge,
  useEdgesState,
  useNodesState,
} from 'reactflow'
import 'reactflow/dist/style.css'

type WorkflowCanvasProps = {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  /** When provided, canvas is controlled: use these nodes/edges and call onGraphChange on changes. */
  nodes?: Node[]
  edges?: Edge[]
  onGraphChange?: (nodes: Node[], edges: Edge[]) => void
  onNodeClick?: (_: unknown, node: Node) => void
}

export function WorkflowCanvas({
  initialNodes = [],
  initialEdges = [],
  nodes: controlledNodes,
  edges: controlledEdges,
  onGraphChange,
  onNodeClick,
}: WorkflowCanvasProps) {
  const [internalNodes, setInternalNodes, onNodesChange] = useNodesState(initialNodes)
  const [internalEdges, setInternalEdges, onEdgesChange] = useEdgesState(initialEdges)

  const nodes = controlledNodes ?? internalNodes
  const edges = controlledEdges ?? internalEdges

  const onConnect = (params: Connection) => {
    const nextEdges = addEdge(params, edges)
    if (controlledEdges != null && onGraphChange) {
      onGraphChange(nodes, nextEdges)
    } else {
      setInternalEdges(nextEdges)
    }
  }

  const handleNodesChange = (changes: Parameters<typeof onNodesChange>[0]) => {
    if (controlledNodes != null && onGraphChange) {
      let next = [...nodes]
      for (const change of changes) {
        if (change.type === 'remove') next = next.filter((n) => n.id !== change.id)
        else if (change.type === 'add' && change.item) next = [...next, change.item]
        else if (change.type === 'position') {
          if (change.position != null) {
            next = next.map((n) => (n.id === change.id ? { ...n, position: change.position! } : n))
          }
          if (change.dragging != null) {
            next = next.map((n) => (n.id === change.id ? { ...n, dragging: change.dragging } : n))
          }
        } else if (change.type === 'dimensions' && change.dimensions) {
          next = next.map((n) => (n.id === change.id ? { ...n, measured: { ...n.measured, dimensions: change.dimensions } } : n))
        } else if (change.type === 'select') {
          next = next.map((n) => (n.id === change.id ? { ...n, selected: change.selected } : n))
        }
      }
      onGraphChange(next, edges)
    } else {
      onNodesChange(changes)
      if (onGraphChange) onGraphChange(internalNodes, internalEdges)
    }
  }

  const handleEdgesChange = (changes: Parameters<typeof onEdgesChange>[0]) => {
    if (controlledEdges != null && onGraphChange) {
      let next = [...edges]
      for (const change of changes) {
        if (change.type === 'remove') next = next.filter((e) => e.id !== change.id)
        else if (change.type === 'add' && change.item) next = [...next, change.item]
        else if (change.type === 'select') {
          next = next.map((e) => (e.id === change.id ? { ...e, selected: change.selected } : e))
        }
      }
      onGraphChange(nodes, next)
    } else {
      onEdgesChange(changes)
      if (onGraphChange) onGraphChange(internalNodes, internalEdges)
    }
  }

  return (
    <div
      style={{ height: '480px', borderRadius: '0.75rem', overflow: 'hidden', background: '#020617' }}
      aria-label="Workflow canvas"
      role="group"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  )
}

