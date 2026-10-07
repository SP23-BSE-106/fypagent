import type { WorkflowGraph } from '@/lib/mongo/workflow'
import { chatCompletion } from '@/lib/llm'
import { generateEmbedding } from '@/lib/rag/embeddings'
import { searchChunks } from '@/lib/rag/vectorStore'

export type TraceStep = {
  nodeId: string
  name: string
  type: string
  ok: boolean
  durationMs: number
  summary: string
}

export type ExecutionResult = {
  output: string
  trace: TraceStep[]
  sources: Array<{ text: string; similarity: number }>
  provider: string | null
  model: string | null
}

async function executeApiNode(config: Record<string, unknown> | undefined, state: string): Promise<string> {
  const url = typeof config?.url === 'string' ? config.url.trim() : ''
  if (!url) return state
  try {
    new URL(url)
  } catch {
    return `Invalid API URL: ${url}`
  }
  const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10_000) })
  const text = await response.text().catch(() => '')
  return text.slice(0, 4000)
}

async function executeNode(node: { type?: string; name?: string; id?: string; config?: Record<string, unknown> }, state: string, userId: string, sources: Array<{ text: string; similarity: number }>): Promise<{ state: string; ok: boolean; summary: string; provider?: string | null; model?: string | null }> {
  const start = Date.now()
  try {
    switch (node.type) {
      case 'trigger':
        return { state, ok: true, summary: `Received input (${state.length} chars).` }
      case 'llm': {
        const system = typeof node.config?.systemPrompt === 'string' && node.config.systemPrompt.trim()
          ? node.config.systemPrompt
          : `You are the "${node.name || 'Agent'}" node in an AgentFlow workflow.`
        const completion = await chatCompletion({ system, prompt: state, timeoutMs: 30_000 })
        if (!completion.ok) return { state, ok: false, summary: 'No inference provider answered.' }
        return { state: completion.text, ok: true, summary: `LLM answered via ${completion.provider || 'provider'}.`, provider: completion.provider, model: completion.model }
      }
      case 'rag': {
        const queryVector = await generateEmbedding(state)
        const { hits } = await searchChunks({ userId, queryVector, topK: 3 })
        for (const hit of hits) sources.push({ text: hit.text.slice(0, 300), similarity: hit.similarity })
        const context = hits.map((hit, i) => `[Chunk ${i + 1}]\n${hit.text}`).join('\n\n')
        return { state: context || state, ok: true, summary: `Retrieved ${hits.length} chunk(s).` }
      }
      case 'api':
        return { state: await executeApiNode(node.config, state), ok: true, summary: 'API node called.' }
      case 'condition': {
        const expression = typeof node.config?.expression === 'string' ? node.config.expression : 'true'
        let result = true
        try {
          // Minimal safe-ish expression over the current state string.
          result = Boolean(new Function('state', `return ${expression}`)(state))
        } catch {
          result = false
        }
        return { state: result ? 'true' : 'false', ok: true, summary: `Condition evaluated to ${result}.` }
      }
      case 'output':
        return { state, ok: true, summary: `Output ready (${state.length} chars).` }
      default:
        return { state, ok: true, summary: `Node type "${node.type}" executed.` }
    }
  } catch (error) {
    return { state, ok: false, summary: error instanceof Error ? error.message : 'failed' }
  } finally {
    // duration is recorded by the caller
    void start
  }
}

export async function executeWorkflow(graph: WorkflowGraph, input: string, userId: string): Promise<ExecutionResult> {
  const nodes = graph?.nodes || []
  const edges = graph?.edges || []
  const trace: TraceStep[] = []
  const sources: Array<{ text: string; similarity: number }> = []
  let provider: string | null = null
  let model: string | null = null

  if (!nodes.length) {
    return { output: input, trace, sources, provider, model }
  }

  const byId = new Map(nodes.map((node) => [node.id, node]))
  const outgoing = new Map<string, typeof edges>()
  for (const edge of edges) {
    const list = outgoing.get(edge.source) || []
    list.push(edge)
    outgoing.set(edge.source, list)
  }

  const trigger = nodes.find((node) => node.type === 'trigger') || nodes[0]
  const queue: string[] = [trigger.id]
  const visited = new Set<string>()
  let state = input

  while (queue.length) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    const node = byId.get(id)
    if (!node) continue

    const start = Date.now()
    const result = await executeNode(node, state, userId, sources)
    trace.push({ nodeId: node.id, name: node.name, type: node.type, ok: result.ok, durationMs: Date.now() - start, summary: result.summary })
    if (result.provider) provider = result.provider
    if (result.model) model = result.model
    state = result.state

    const nextEdges = outgoing.get(id) || []
    if (node.type === 'condition' && nextEdges.length > 1) {
      const wanted = state === 'true' ? 'true' : 'false'
      const chosen = nextEdges.find((edge) => String(edge.label || '').toLowerCase().includes(wanted)) || nextEdges[state === 'true' ? 0 : nextEdges.length - 1]
      if (chosen) queue.push(chosen.target)
    } else {
      for (const edge of nextEdges) queue.push(edge.target)
    }
  }

  return { output: state, trace, sources, provider, model }
}
