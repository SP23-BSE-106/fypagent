import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { ObjectId, type Db } from 'mongodb'

import { rateLimit } from '@/lib/rateLimit'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import { getDb } from '@/lib/mongo/mongo'
import { chatCompletion } from '@/lib/llm'
import { generateEmbedding } from '@/lib/rag/embeddings'
import { searchChunks } from '@/lib/rag/vectorStore'
import { executeWorkflow } from '@/lib/workflow/executor'

// The model call below can take most of half a minute on a cold provider; the
// route has to declare the budget or Vercel cuts the function off first.
export const maxDuration = 60

type AuthContext = {
  db: Db
  userId: string
  /** Set when the caller authenticated with an API key rather than a cookie. */
  keyId: ObjectId | null
}

/**
 * Accepts either an `Authorization: Bearer sk_live_…` key (the point of a
 * public API) or the dashboard's session cookie. Keys are stored hashed, so a
 * leaked database does not yield working credentials.
 */
async function authenticate(request: NextRequest): Promise<AuthContext | { error: string; status: number }> {
  const header = request.headers.get('authorization')

  if (header) {
    if (!header.startsWith('Bearer ')) {
      return { error: 'Authorization header must use the Bearer scheme.', status: 400 }
    }

    const rawKey = header.slice(7).trim()
    if (!rawKey) return { error: 'Empty bearer token.', status: 400 }

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    const db = await getDb()
    const key = await db.collection('personal_api_keys').findOne({ keyHash })

    if (!key) return { error: 'Invalid API key.', status: 401 }
    return { db, userId: String(key.userId), keyId: key._id }
  }

  const token = await getSessionTokenFromCookies()
  if (!token) {
    return { error: 'Provide an Authorization: Bearer <api key> header, or sign in to the dashboard.', status: 401 }
  }

  try {
    const payload = verifyJwt(token)
    return { db: await getDb(), userId: String(payload.sub), keyId: null }
  } catch {
    return { error: 'Invalid session.', status: 401 }
  }
}

/**
 * POST /api/execute
 *
 * Runs one turn of an agent: retrieval over the caller's own knowledge base,
 * then a completion from the agent's configured instruction. Fails loudly when
 * a provider is unavailable — it never reports success it did not have.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rl = rateLimit(`execute:${ip}`, { windowMs: 60_000, max: 20 })
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfterMs: rl.retryAfterMs },
        { status: 429 },
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

    const auth = await authenticate(request)
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { db, userId, keyId } = auth

    const { agentId, input, topK } = body

    const workspaceSettings = await db.collection('workspace_settings').findOne({ userId })
    const permissions = workspaceSettings?.permissions || {}
    if (permissions.canExecute === false) {
      return NextResponse.json({ error: 'Execution permission is disabled for this workspace.' }, { status: 403 })
    }

    const requestedTopK = Number.isFinite(Number(topK)) ? Math.min(10, Math.max(1, Math.round(Number(topK)))) : null
    let effectiveTopK = requestedTopK
    if (effectiveTopK === null) {
      const savedTopK = Number(workspaceSettings?.defaults?.topK)
      effectiveTopK = Number.isFinite(savedTopK) && savedTopK > 0 ? Math.min(10, Math.max(1, Math.round(savedTopK))) : 3
    }

    if (!input || typeof input !== 'string' || !input.trim()) {
      return NextResponse.json({ error: 'input is required' }, { status: 400 })
    }
    if (!agentId || !ObjectId.isValid(agentId)) {
      return NextResponse.json({ error: 'agentId must be a valid agent id' }, { status: 400 })
    }

    const agent = await db.collection('agents').findOne({ _id: new ObjectId(agentId), userId })
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    if (keyId) {
      db.collection('personal_api_keys')
        .updateOne({ _id: keyId }, { $set: { lastUsedAt: new Date() } })
        .catch(() => undefined)
    }

    // If the agent carries a saved workflow graph, execute that graph rather
    // than falling back to the single-turn RAG-only path.
    if (Array.isArray(agent.workflow?.nodes) && agent.workflow.nodes.length > 0) {
      const startedAt = Date.now()
      const result = await executeWorkflow(agent.workflow, input.trim(), userId, { topK: effectiveTopK })
      const durationMs = Date.now() - startedAt

      await db.collection('workflow_runs').insertOne({
        userId,
        kind: 'exec',
        agentId,
        agentName: agent.name,
        status: result.trace.every((step) => step.ok) ? 'success' : 'failed',
        input: input.trim().slice(0, 2000),
        output: result.output.slice(0, 4000),
        sourceCount: result.sources.length,
        durationMs,
        provider: result.provider,
        model: result.model,
        error: result.trace.every((step) => step.ok) ? null : 'one or more nodes failed',
        createdAt: new Date(),
      }).catch(() => undefined)

      return NextResponse.json({
        executed: true,
        agentId,
        agentName: agent.name,
        output: result.output,
        model: result.model,
        provider: result.provider,
        sources: result.sources,
        trace: result.trace,
        executedAt: new Date().toISOString(),
      })
    }

    // ── Retrieval ───────────────────────────────────────────────────────────
    let context = ''
    const sources: Array<{ text: string; similarity: number }> = []

    try {
      const queryVector = await generateEmbedding(input.trim())
      const { hits } = await searchChunks({ userId, queryVector, topK: effectiveTopK })
      for (const hit of hits) {
        sources.push({ text: hit.text.slice(0, 300), similarity: hit.similarity })
      }
      context = hits.map((hit, index) => `[Chunk ${index + 1}]\n${hit.text}`).join('\n\n')
    } catch {
      // An empty knowledge base is a legitimate configuration, not a failure —
      // the run continues without context and says so below.
    }

    const instruction = typeof agent.prompt === 'string' ? agent.prompt.trim() : ''
    const system = [
      instruction || `You are "${agent.name}", an AI agent configured in the agentflow workspace.`,
      context
        ? `Answer using ONLY this retrieved context where it is relevant; if it does not cover the question, say so.\n\n--- CONTEXT ---\n${context}\n--- END CONTEXT ---`
        : 'No documents have been indexed for this workspace yet, so answer from general knowledge and say that no private context was available.',
    ].join('\n\n')

    const completion = await chatCompletion({ system, prompt: input.trim(), timeoutMs: 30_000 })

    if (!completion.ok) {
      return NextResponse.json(
        {
          error: 'No inference provider accepted the request. Check that HF_TOKEN or NVIDIA_API_KEY is configured and try again.',
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      executed: true,
      agentId,
      agentName: agent.name,
      output: completion.text,
      model: completion.model,
      provider: completion.provider,
      sources,
      executedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[execute] failed:', error)
    return NextResponse.json({ error: 'Execution failed' }, { status: 500 })
  }
}
