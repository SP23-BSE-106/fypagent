import { NextRequest, NextResponse } from 'next/server'

import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import type { WorkflowGraph } from '@/lib/mongo/workflow'

// ─── Dev-mode mock ───────────────────────────────────────────────────────────
// Used automatically when NEXT_PUBLIC_MOCK_LLM=true OR when the inference
// server is unreachable in development (NODE_ENV !== 'production').

function buildMockWorkflow(prompt: string): WorkflowGraph {
  const words = prompt.toLowerCase()
  const hasKnowledge = words.includes('knowledge') || words.includes('doc') || words.includes('pdf') || words.includes('search') || words.includes('faq')
  const hasAction = words.includes('send') || words.includes('email') || words.includes('notify') || words.includes('update') || words.includes('post') || words.includes('api') || words.includes('webhook')
  const hasDecision = words.includes('if') || words.includes('condition') || words.includes('route') || words.includes('classify')
  const hasDatabase = words.includes('database') || words.includes('crm') || words.includes('record') || words.includes('save') || words.includes('log')

  const nodes = [
    {
      id: 'node_1',
      name: 'Input Trigger',
      type: 'trigger' as const,
      description: 'Receives the incoming event, request, or webhook payload from the real system.',
    },
    {
      id: 'node_2',
      name: 'Validate Payload',
      type: 'condition' as const,
      description: 'Checks that the request contains the required fields before any work proceeds.',
    },
    {
      id: 'node_3',
      name: 'Classify Intent',
      type: 'llm' as const,
      description: 'Uses the model to determine the intent, priority, and required next step from the input.',
    },
    ...(hasKnowledge ? [{
      id: 'node_4',
      name: 'Retrieve Knowledge Context',
      type: 'rag' as const,
      description: 'Searches the uploaded files, policy notes, or knowledge base for relevant context.',
    }] : []),
    ...(hasDatabase ? [{
      id: 'node_5',
      name: 'Read or Update Data Store',
      type: 'api' as const,
      description: 'Reads from or writes to the connected database, CRM, or internal system.',
    }] : []),
    ...(hasAction ? [{
      id: hasDatabase ? 'node_6' : 'node_5',
      name: 'Perform Action',
      type: 'api' as const,
      description: 'Calls the target API, sends the message, or triggers the downstream workflow step.',
    }] : []),
    {
      id: 'node_out',
      name: 'Return Result',
      type: 'output' as const,
      description: 'Returns the final response, status, or action summary to the calling system.',
    },
  ]

  const edges = nodes.slice(0, -1).map((n, i) => ({
    id: `edge_${i + 1}`,
    source: n.id,
    target: nodes[i + 1].id,
  }))

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
    description: `Concrete workflow for: "${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}". Each node is designed to map to a real action in the final system.`,
    nodes,
    edges,
  }
}

function fallbackWorkflowResponse(prompt: string, reason: string) {
  return NextResponse.json({ workflow: buildMockWorkflow(prompt), _mock: true, warning: reason })
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

  // ── Forward to NVIDIA API (Kimi K2.6) ─────────────────────────────────
  let inferenceRes: Response
  try {
    const systemPrompt = `You are an AI workflow generator. The user will give you a prompt. You must generate a workflow graph consisting of nodes and edges to fulfill the user's intent.
You MUST output ONLY valid JSON in the following format:
{
  "workflow": {
    "name": "Generated Agent Name",
    "description": "Brief description",
    "nodes": [
      {
        "id": "node_1",
        "name": "Node Name",
        "type": "trigger|llm|rag|api|condition|output",
        "description": "What this node does"
      }
    ],
    "edges": [
      {
        "id": "edge_1",
        "source": "node_1",
        "target": "node_2"
      }
    ]
  }
}
Do not wrap your response in markdown blocks like \`\`\`json. Just output the raw JSON object.`;

    inferenceRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: "moonshotai/kimi-k2.6",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 2048,
        temperature: 0.7,
        top_p: 1.0,
        stream: false
      }),
      signal: AbortSignal.timeout(120_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[generate] Inference server unreachable — using fallback workflow.', msg)
    await new Promise((r) => setTimeout(r, 1200))
    return fallbackWorkflowResponse(prompt, msg)
  }

  if (!inferenceRes.ok) {
    const detail = await inferenceRes.text().catch(() => '')
    console.warn('[generate] Inference API returned an error — using fallback workflow.', inferenceRes.status, detail)
    await new Promise((r) => setTimeout(r, 1200))
    return fallbackWorkflowResponse(prompt, detail || `status ${inferenceRes.status}`)
  }

  const data = await inferenceRes.json()
  
  let workflow = null;
  try {
    const content = data.choices?.[0]?.message?.content || "";
    const cleanContent = content.replace(/^\s*```json/mi, '').replace(/```\s*$/m, '').trim();
    const parsed = JSON.parse(cleanContent);
    workflow = parsed.workflow || parsed;
  } catch (e) {
    console.warn('Failed to parse API response — using fallback workflow.', e)
    await new Promise((r) => setTimeout(r, 1200))
    return fallbackWorkflowResponse(prompt, 'invalid response payload')
  }

  if (!workflow || typeof workflow !== 'object') {
    console.warn('Inference server returned an invalid workflow payload — using fallback workflow.')
    await new Promise((r) => setTimeout(r, 1200))
    return fallbackWorkflowResponse(prompt, 'invalid workflow payload')
  }

  return NextResponse.json({ workflow })
}
