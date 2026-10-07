import type { WorkflowGraph } from '@/lib/mongo/workflow'

/**
 * Curated starting shapes for generated agents. Keeping these as concrete
 * graphs (instead of only asking the LLM for JSON) gives the generator a
 * template to adapt and makes the result deterministic enough to validate.
 */
export const WORKFLOW_TEMPLATES: Array<{
  id: string
  name: string
  description: string
  keywords: string[]
  graph: WorkflowGraph
}> = [
  {
    id: 'faq-knowledge',
    name: 'Knowledge Assistant',
    description: 'Answers questions from uploaded documents.',
    keywords: ['pdf', 'doc', 'knowledge', 'faq', 'search', 'policy', 'manual'],
    graph: {
      nodes: [
        { id: 'trigger_1', name: 'User Question', type: 'trigger', description: 'Receives the user question.', config: {} },
        { id: 'rag_1', name: 'Retrieve Context', type: 'rag', description: 'Finds relevant document chunks.', config: { topK: 3 } },
        { id: 'llm_1', name: 'Answer Writer', type: 'llm', description: 'Writes a grounded answer.', config: { systemPrompt: 'Answer only from retrieved context.' } },
        { id: 'output_1', name: 'Return Answer', type: 'output', description: 'Returns the final answer.', config: {} },
      ],
      edges: [
        { id: 'e1', source: 'trigger_1', target: 'rag_1' },
        { id: 'e2', source: 'rag_1', target: 'llm_1' },
        { id: 'e3', source: 'llm_1', target: 'output_1' },
      ],
    },
  },
  {
    id: 'support-email',
    name: 'Support Notifier',
    description: 'Classifies and notifies support.',
    keywords: ['email', 'notify', 'send', 'support', 'ticket', 'help'],
    graph: {
      nodes: [
        { id: 'trigger_1', name: 'Incoming Request', type: 'trigger', description: 'Receives the support request.', config: {} },
        { id: 'llm_1', name: 'Classify Intent', type: 'llm', description: 'Summarizes the request.', config: { systemPrompt: 'Classify the support request.' } },
        { id: 'api_1', name: 'Send Notification', type: 'api', description: 'Calls the notification webhook.', config: { url: '' } },
        { id: 'output_1', name: 'Confirm', type: 'output', description: 'Returns confirmation.', config: {} },
      ],
      edges: [
        { id: 'e1', source: 'trigger_1', target: 'llm_1' },
        { id: 'e2', source: 'llm_1', target: 'api_1' },
        { id: 'e3', source: 'api_1', target: 'output_1' },
      ],
    },
  },
]
