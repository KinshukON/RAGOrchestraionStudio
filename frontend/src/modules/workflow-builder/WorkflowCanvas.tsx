import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
  addEdge,
  useEdgesState,
  useNodesState,
} from 'reactflow'
import 'reactflow/dist/style.css'

type WorkflowCanvasProps = {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  onGraphChange?: (nodes: Node[], edges: Edge[]) => void
}

export function WorkflowCanvas({ initialNodes = [], initialEdges = [], onGraphChange }: WorkflowCanvasProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = (params: any) => {
    setEdges((eds) => addEdge(params, eds))
  }

  const handleNodesChange: typeof onNodesChange = (changes) => {
    onNodesChange(changes)
    if (onGraphChange) {
      onGraphChange(nodes, edges)
    }
  }

  const handleEdgesChange: typeof onEdgesChange = (changes) => {
    onEdgesChange(changes)
    if (onGraphChange) {
      onGraphChange(nodes, edges)
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
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  )
}

