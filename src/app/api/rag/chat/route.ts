import { NextRequest, NextResponse } from 'next/server'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import { generateEmbedding } from '@/lib/rag/embeddings'
import { searchChunks } from '@/lib/rag/vectorStore'

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
    let debugInfo = { userId, chunksFound: 0, embeddingError: null as any }

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
      ? `You are a helpful AI assistant. Answer the user's question using ONLY the following retrieved knowledge base documents as context. If the answer is not found in the context, say so clearly. Be concise but thorough.

--- KNOWLEDGE BASE CONTEXT ---
${ragContext}
--- END CONTEXT ---`
      : `You are a helpful AI assistant. The user has no documents in their knowledge base yet. Let them know they should upload documents first, then answer as best you can from general knowledge.`

    // Optional third LLM endpoint. (Embeddings no longer use this key — they
    // are generated locally by the model in src/lib/rag/embeddings.ts.)
    const kimiApiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY

    let answer = ''

    // Determine which LLM endpoint + key to use
    // HuggingFace (primary) -> NVIDIA (fallback) -> Moonshot direct (fallback)
    const endpoints = [
      {
        url: 'https://router.huggingface.co/v1/chat/completions',
        key: process.env.HF_TOKEN,
        model: 'moonshotai/Kimi-K3:together',
        name: 'HuggingFace (Kimi K3)'
      },
      {
        url: 'https://integrate.api.nvidia.com/v1/chat/completions',
        key: process.env.NVIDIA_API_KEY,
        model: 'moonshotai/kimi-k3',
        name: 'NVIDIA (Kimi K3)'
      },
      ...(kimiApiKey
        ? [{
          url: 'https://api.moonshot.cn/v1/chat/completions',
          key: kimiApiKey,
          model: 'moonshot-v1-8k',
          name: 'Moonshot Direct'
        }]
        : [])
    ]

    try {
      let inferenceRes: Response | null = null

      for (const ep of endpoints) {
        if (!ep.key) {
          console.warn(`[rag/chat] ${ep.name} API key not configured, skipping...`)
          continue
        }

        try {
          console.log(`[rag/chat] Trying ${ep.name}...`)
          inferenceRes = await fetch(ep.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ep.key}`,
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              model: ep.model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: question },
              ],
              max_tokens: 1024,
              temperature: 0.4,
              top_p: 0.95,
              stream: false,
            }),
            signal: AbortSignal.timeout(60_000),
          })

          if (inferenceRes.ok) {
            console.log(`[rag/chat] ${ep.name} succeeded`)
            break // success, stop trying
          }
          console.warn(`[rag/chat] ${ep.name} returned ${inferenceRes.status}, trying next...`)
        } catch (epErr) {
          console.warn(`[rag/chat] ${ep.name} failed:`, epErr)
        }
      }

      if (inferenceRes && inferenceRes.ok) {
        const data = await inferenceRes.json()
        answer = data?.choices?.[0]?.message?.content || 'No response generated.'
      } else {
        const errText = inferenceRes ? await inferenceRes.text().catch(() => 'Unknown error') : 'All endpoints failed'
        console.warn('[rag/chat] All LLM endpoints failed:', errText)
        // Fallback: return the raw context
        answer = ragContext
          ? `[LLM unavailable — showing matched knowledge base content]\n\n${ragContext}`
          : 'The AI model is temporarily unavailable. Please try again shortly.'
      }
    } catch (llmError) {
      console.warn('[rag/chat] LLM call failed:', llmError)
      answer = ragContext
        ? `[LLM unavailable — showing matched knowledge base content]\n\n${ragContext}`
        : 'The AI model is temporarily unavailable. Please try again shortly.'
    }

    return NextResponse.json({
      question,
      answer,
      sources: ragSources.map((s) => ({
        text: s.text.slice(0, 200) + (s.text.length > 200 ? '...' : ''),
        similarity: s.similarity,
        documentId: s.documentId,
      })),
    })
  } catch (error: any) {
    console.error('RAG Chat Error:', error)
    return NextResponse.json(
      { error: error.message || 'RAG chat failed' },
      { status: 500 }
    )
  }
}
