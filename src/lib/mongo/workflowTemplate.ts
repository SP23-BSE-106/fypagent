import type { WorkflowGraph } from './workflow'

export type WorkflowTemplate = {
  _id?: string
  ownerUserId?: string

  name: string
  description?: string
  graph: WorkflowGraph

  tags?: string[]

  createdAt: Date
  updatedAt?: Date
}

