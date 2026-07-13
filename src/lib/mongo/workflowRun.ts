import type { WorkflowGraph } from './workflow'

export type WorkflowRun = {
  _id?: string
  userId: string
  agentId?: string

  /** Workflow graph at execution time (snapshot) */
  workflow?: WorkflowGraph

  /** Optional original input payload */
  input?: Record<string, unknown>

  /** Optional output payload (or summary) */
  output?: Record<string, unknown>

  status: 'queued' | 'running' | 'success' | 'failed'
  error?: {
    name?: string
    message?: string
    stack?: string
    [key: string]: unknown
  }

  startedAt?: Date
  finishedAt?: Date

  /** Arbitrary metadata for debugging/analytics */
  metadata?: Record<string, unknown>

  createdAt: Date
}

