import { NextRequest, NextResponse } from 'next/server'

import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import type { WorkflowGraph } from '@/lib/mongo/workflow'
import { WORKFLOW_TEMPLATES } from '@/lib/workflow/templates'

// ─── Dev-mode mock ───────────────────────────────────────────────────────────
// Used automatically when NEXT_PUBLIC_MOCK_LLM=true OR when the inference
// server is unreachable in development (NODE_ENV !== 'production').

function buildMockWorkflow(prompt: string): WorkflowGraph {
  const lower = prompt.toLowerCase()
  const scored = WORKFLOW_TEMPLATES.map((template) => ({
    template,
    score: template.keywords.reduce((total, keyword) => total + (lower.includes(keyword) ? 2 : 0), 0),
  })).sort((a, b) => b.score - a.score)

  const selected = scored[0]?.template ?? WORKFLOW_TEMPLATES[0]

  const agentName = prompt
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ') + ' Agent'

  // Copy the template graph so the caller receives a fresh object and the
  // shared template stays immutable.
  const graph = JSON.parse(JSON.stringify(selected.graph)) as WorkflowGraph
  const customName = agentName.trim() || selected.name
  return {
    // @ts-expect-error — name/description are extra convenience fields
    name: customName,
    description: `Generated from the "${selected.name}" pattern for: "${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}".`,
    nodes: graph.nodes,
    edges: graph.edges,
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

  // ── Inference endpoints (HuggingFace primary, NVIDIA fallback) ─────────────────
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

  const endpoints = [
    // OpenRouter is the first configured agent-generation provider.
    {
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o',
      name: 'OpenRouter (GPT-4o)'
    },
    // Agent creation uses HuggingFace's Together provider, as before.
    {
      url: 'https://router.huggingface.co/v1/chat/completions',
      key: process.env.HF_TOKEN,
      model: process.env.HF_MODEL || 'moonshotai/Kimi-K3:together',
      name: 'HuggingFace/Together (Kimi K3)'
    },
    // Fallback: NVIDIA API
    {
      url: 'https://integrate.api.nvidia.com/v1/chat/completions',
      key: process.env.NVIDIA_API_KEY,
      model: process.env.NVIDIA_MODEL || 'moonshotai/kimi-k3',
      name: 'NVIDIA (Kimi K3)'
    },
  ]

  let inferenceRes: Response | null = null
  let lastError: string = ''

  for (const ep of endpoints) {
    if (!ep.key) {
      console.warn(`[generate] ${ep.name} API key not configured, skipping...`)
      continue
    }

    try {
      console.log(`[generate] Trying ${ep.name}...`)
      inferenceRes = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ep.key}`,
          'Accept': 'application/json',
          ...(ep.url.includes('openrouter.ai')
            ? {
                'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
                'X-Title': process.env.OPENROUTER_SITE_NAME || 'AgentFlow',
              }
            : {}),
        },
        body: JSON.stringify({
          model: ep.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          max_tokens: 2048,
          temperature: 0.7,
          top_p: 1.0,
          stream: false
        }),
        // Two providers are tried in sequence; each attempt has to finish well
        // inside the route's 60s budget or the function dies mid-loop.
        signal: AbortSignal.timeout(25_000),
      })

      if (inferenceRes.ok) {
        console.log(`[generate] ${ep.name} succeeded`)
        break // Success, stop trying other endpoints
      }

      lastError = `${ep.name} returned ${inferenceRes.status}`
      console.warn(`[generate] ${lastError}, trying next endpoint...`)
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      console.warn(`[generate] ${ep.name} failed: ${lastError}, trying next endpoint...`)
    }
  }

  if (!inferenceRes || !inferenceRes.ok) {
    console.warn('[generate] All inference endpoints failed — using fallback workflow.', lastError)
    await new Promise((r) => setTimeout(r, 1200))
    return fallbackWorkflowResponse(prompt, lastError || 'All endpoints unavailable')
  }

  if (!inferenceRes.ok) {
    const detail = await inferenceRes.text().catch(() => '')
    console.warn('[generate] Inference API returned an error — using fallback workflow.', inferenceRes.status, detail)
    await new Promise((r) => setTimeout(r, 1200))
    return fallbackWorkflowResponse(prompt, detail || `status ${inferenceRes.status}`)
  }

  // A provider can answer with HTML or an empty body; without this guard that
  // throws past the fallback logic and the caller gets a 500 instead of the
  // mock workflow the handler is designed to return.
  const data = (await inferenceRes.json().catch((parseError) => {
    console.warn('[generate] Inference API returned a non-JSON body - using fallback workflow.', parseError)
    return null
  })) as { choices?: Array<{ message?: { content?: string } }> } | null

  if (!data) {
    await new Promise((r) => setTimeout(r, 1200))
    return fallbackWorkflowResponse(prompt, 'non-JSON response payload')
  }

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
