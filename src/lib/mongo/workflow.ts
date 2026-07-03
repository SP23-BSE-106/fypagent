// TypeScript types for the workflow graph stored inside an Agent document.

export type NodeType =
  | 'trigger'
  | 'llm'
  | 'rag'
  | 'api'
  | 'condition'
  | 'output'
  | 'tool'
  | 'memory'

export type WorkflowNode = {
  id: string
  name: string
  type: NodeType
  description: string
  /** Optional extra config (e.g. system prompt, API URL, condition expression) */
  config?: Record<string, unknown>
}

export type WorkflowEdge = {
  id: string
  source: string // node id
  target: string // node id
  label?: string
}

export type WorkflowGraph = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}
