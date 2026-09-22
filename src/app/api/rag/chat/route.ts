import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import { generateEmbedding, cosineSimilarity } from '@/lib/rag/embeddings'

/**
 * POST /api/rag/chat
 * 
 * RAG-augmented chat endpoint:
 * 1. Retrieves relevant document chunks from the user's knowledge base
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

    const kimiApiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY

    // ── Step 1: RAG Retrieval ──────────────────────────────────────────────
    let ragContext = ''
    let ragSources: { text: string; similarity: number; documentId: string }[] = []
    let debugInfo = { userId, chunksFound: 0, embeddingError: null as any }

    try {
      const db = await getDb()
      
      // First, check how many chunks exist for this user
      const totalChunks = await db.collection('rag_chunks').countDocuments({ userId })
      debugInfo.chunksFound = totalChunks
      console.log(`[rag/chat] User ${userId} has ${totalChunks} chunks in knowledge base`)

      if (totalChunks === 0) {
        console.warn(`[rag/chat] No chunks found for user ${userId}. Knowledge base is empty.`)
      } else {
        const queryVector = await generateEmbedding(question, kimiApiKey)
        const chunks = await db.collection('rag_chunks').find({ userId }).toArray()

        if (chunks.length > 0) {
          const scored = chunks
            .map((chunk) => ({
              text: chunk.text as string,
              documentId: chunk.documentId as string,
              similarity: chunk.embedding
                ? cosineSimilarity(queryVector, chunk.embedding)
                : 0,
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK)

          ragSources = scored
          ragContext = scored.map((s, i) => `[Document Chunk ${i + 1}]:\n${s.text}`).join('\n\n')
        }
      }
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
