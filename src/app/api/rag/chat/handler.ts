import { NextRequest, NextResponse } from 'next/server'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import { generateEmbedding } from '@/lib/rag/embeddings'
import { searchChunks } from '@/lib/rag/vectorStore'
import { chatCompletion } from '@/lib/llm'

/**
 * POST /api/rag/chat
 * 
 * RAG-augmented chat endpoint:
 * 1. Retrieves relevant document chunks from the user's knowledge base
 *    (local embedding + Atlas vector index, exact-cosine fallback)
 * 2. Sends the user question + retrieved context to Kimi LLM
 * 3. Returns an intelligent, grounded answer
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getSessionTokenFromCookies()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyJwt(token)
    const userId = payload.sub

    const body = await req.json().catch(() => ({}))
    const { question, topK = 3 } = body

    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    // ── Step 1: RAG Retrieval ──────────────────────────────────────────────
    let ragContext = ''
    let ragSources: { text: string; similarity: number; documentId: string }[] = []
    const debugInfo: { userId: string; chunksFound: number; embeddingError: string | null } = {
      userId,
      chunksFound: 0,
      embeddingError: null,
    }

    try {
      const queryVector = await generateEmbedding(question)
      const { hits, engine } = await searchChunks({ userId, queryVector, topK })

      debugInfo.chunksFound = hits.length
      console.log(`[rag/chat] User ${userId} retrieved ${hits.length} chunk(s) via ${engine}`)

      ragSources = hits.map((hit) => ({
        text: hit.text,
        documentId: hit.documentId,
        similarity: hit.similarity,
      }))
      ragContext = ragSources
        .map((s, i) => `[Document Chunk ${i + 1}]:\n${s.text}`)
        .join('\n\n')
    } catch (ragError) {
      debugInfo.embeddingError = ragError instanceof Error ? ragError.message : String(ragError)
      console.warn('[rag/chat] RAG retrieval failed, proceeding without context:', ragError)
    }

    // ── Step 2: LLM Generation with RAG Context ───────────────────────────
    const systemPrompt = ragContext
      ? `You are a helpful AI assistant. Answer the user's question using ONLY the following retrieved knowledge base documents as context. If the answer is not found in the context, say so clearly. Be concise but natural, human-friendly, and conversational.

--- KNOWLEDGE BASE CONTEXT ---
${ragContext}
--- END CONTEXT ---`
      : `You are a helpful AI assistant. The user has no documents in their knowledge base yet. Let them know they should upload documents first, then answer as best you can from general knowledge. Be natural, human-friendly, and conversational.`

    // Optional third LLM endpoint. (Embeddings no longer use this key — they
    // are generated locally by the model in src/lib/rag/embeddings.ts.)
    // The provider walk itself lives in src/lib/llm.ts, shared with /api/execute.
    const completion = await chatCompletion({
      system: systemPrompt,
      prompt: question,
      // Comfortably inside the route's 60s budget once embedding and vector
      // search have already run.
      timeoutMs: 30_000,
    })

    const answer = completion.ok
      ? completion.text
      : ragContext
        ? `[LLM unavailable — showing matched knowledge base content]\n\n${ragContext}`
        : 'The AI model is temporarily unavailable. Please try again shortly.'

    if (!completion.ok) {
      console.warn('[rag/chat] no inference provider accepted the request', completion.failures)
    }

    return NextResponse.json({
      question,
      answer,
      model: completion.model,
      provider: completion.provider,
      sources: ragSources.map((s) => ({
        text: s.text.slice(0, 200) + (s.text.length > 200 ? '...' : ''),
        similarity: s.similarity,
        documentId: s.documentId,
      })),
    })
  } catch (error: unknown) {
    console.error('RAG Chat Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message || 'RAG chat failed' : 'RAG chat failed' },
      { status: 500 }
    )
  }
}
