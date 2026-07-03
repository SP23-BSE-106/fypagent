import { NextRequest, NextResponse } from 'next/server'

import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import type { WorkflowGraph } from '@/lib/mongo/workflow'

const INFERENCE_URL =
  process.env.INFERENCE_SERVER_URL || 'http://localhost:8000'

// ─── Dev-mode mock ───────────────────────────────────────────────────────────
// Used automatically when NEXT_PUBLIC_MOCK_LLM=true OR when the inference
// server is unreachable in development (NODE_ENV !== 'production').

function buildMockWorkflow(prompt: string): WorkflowGraph {
  const words = prompt.toLowerCase()

  // Adapt the mock nodes based on keywords in the prompt
  const hasRAG  = words.includes('pdf') || words.includes('doc') || words.includes('knowledge') || words.includes('search')
  const hasSlack = words.includes('slack') || words.includes('notify') || words.includes('alert')
  const hasEmail = words.includes('email') || words.includes('mail')
  const hasDB    = words.includes('database') || words.includes('crm') || words.includes('log')
  const hasGit   = words.includes('github') || words.includes('pull request') || words.includes('pr')
  const hasAPI   = words.includes('api') || words.includes('webhook') || words.includes('http')

  const nodes = [
    {
      id: 'node_1',
      name: hasGit ? 'GitHub Webhook Trigger' : hasEmail ? 'Email / Webhook Trigger' : 'Trigger',
      type: 'trigger' as const,
      description: hasGit
        ? 'Fires on pull_request events from GitHub via webhook.'
        : hasEmail
        ? 'Listens for incoming email or HTTP webhook payloads.'
        : 'Entry point that initiates the agent workflow.',
    },
    {
      id: 'node_2',
      name: 'Intent Classifier (LLM)',
      type: 'llm' as const,
      description: 'Analyses the incoming payload and classifies the user intent into categories.',
    },
    ...(hasRAG
      ? [{
          id: 'node_3',
          name: 'Knowledge Base Retrieval (RAG)',
          type: 'rag' as const,
          description: 'Performs vector similarity search over indexed documents to fetch relevant context.',
        }]
      : []),
    ...(hasAPI
      ? [{
          id: 'node_4',
          name: 'External API Call',
          type: 'api' as const,
          description: 'Calls a third-party REST API to enrich or act on the data.',
        }]
      : []),
    {
      id: 'node_5',
      name: 'Decision Gate',
      type: 'condition' as const,
      description: 'Routes the flow based on the classified intent or API response.',
    },
    {
      id: 'node_6',
      name: 'Response Generator (LLM)',
      type: 'llm' as const,
      description: hasGit
        ? 'Generates a detailed code-review comment using the retrieved diff context.'
        : hasEmail
        ? 'Drafts a personalised reply using the retrieved document context.'
        : 'Generates the final response or action payload.',
    },
    ...(hasSlack
      ? [{
          id: 'node_7',
          name: 'Slack Notification',
          type: 'api' as const,
          description: 'Posts a formatted message to the configured Slack channel.',
        }]
      : []),
    ...(hasDB
      ? [{
          id: 'node_8',
          name: 'Database / CRM Update',
          type: 'api' as const,
          description: 'Writes the result or ticket record to the connected database or CRM system.',
        }]
      : []),
    {
      id: 'node_out',
      name: 'Output',
      type: 'output' as const,
      description: 'Delivers the final response to the end channel (email, webhook, dashboard).',
    },
  ]

  // Auto-generate a linear edge chain
  const edges = nodes.slice(0, -1).map((n, i) => ({
    id: `edge_${i + 1}`,
    source: n.id,
    target: nodes[i + 1].id,
  }))

  // Derive a name from the first ~5 meaningful words of the prompt
  const agentName = prompt
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ') + ' Agent'

  return {
    // @ts-expect-error — name/description are extra convenience fields
    name: agentName,
    description: `Auto-generated workflow for: "${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}"`,
    nodes,
    edges,
  }
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const token = await getSessionTokenFromCookies()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    verifyJwt(token)
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  const body = await request.json().catch(() => null)
  const prompt: string = body?.prompt ?? ''

  if (!prompt.trim()) {
    return NextResponse.json(
      { error: 'prompt is required' },
      { status: 400 },
    )
  }

  const useMock =
    process.env.NEXT_PUBLIC_MOCK_LLM === 'true' ||
    process.env.MOCK_LLM === 'true'

  // ── Dev mock path ────────────────────────────────────────────────────────
  if (useMock) {
    // Simulate model thinking time
    await new Promise((r) => setTimeout(r, 2500))
    return NextResponse.json({ workflow: buildMockWorkflow(prompt), _mock: true })
  }

  // ── Forward to Nemotron inference server ─────────────────────────────────
  let inferenceRes: Response
  try {
    inferenceRes = await fetch(`${INFERENCE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, max_new_tokens: 1024 }),
      signal: AbortSignal.timeout(120_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)

    // In development, fall back to mock automatically so the UI remains usable
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[generate] Inference server unreachable — using dev mock. Start inference_server.py for real generation.')
      await new Promise((r) => setTimeout(r, 2500))
      return NextResponse.json({ workflow: buildMockWorkflow(prompt), _mock: true })
    }

    return NextResponse.json(
      {
        error: 'Cannot reach the Nemotron inference server.',
        detail: msg,
        hint: 'Make sure inference_server.py is running: python inference_server.py',
      },
      { status: 503 },
    )
  }

  if (!inferenceRes.ok) {
    const detail = await inferenceRes.text().catch(() => '')
    return NextResponse.json(
      { error: 'Inference server error', detail },
      { status: inferenceRes.status },
    )
  }

  const data = await inferenceRes.json()
  const workflow = data?.workflow

  if (!workflow || typeof workflow !== 'object') {
    return NextResponse.json(
      { error: 'Inference server returned an invalid workflow payload' },
      { status: 502 },
    )
  }

  return NextResponse.json({ workflow })
}
