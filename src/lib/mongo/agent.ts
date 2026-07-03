import type { WorkflowGraph } from './workflow'

export type Agent = {
  _id: string
  userId: string
  name: string
  description?: string
  /** Original plain-English prompt used to generate the workflow */
  prompt?: string
  /** Generated workflow graph (nodes + edges) */
  workflow?: WorkflowGraph
  /** The LLM provider the agent will use at runtime (user-supplied) */
  llmProvider?: 'openai' | 'anthropic' | 'groq' | 'gemini' | 'cohere' | string
  /** AES-256-GCM encrypted API key for the chosen provider */
  userApiKey?: string
  /** Workflow status */
  status?: 'draft' | 'active'
  /** User-defined tags for categorisation */
  tags?: string[]
  createdAt: Date
  updatedAt?: Date
}
