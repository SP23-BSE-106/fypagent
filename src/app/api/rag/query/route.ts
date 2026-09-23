import { NextRequest, NextResponse } from 'next/server'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import { generateEmbedding } from '@/lib/rag/embeddings'
import { searchChunks } from '@/lib/rag/vectorStore'

/**
 * POST /api/rag/query
 *
 * Semantic search over the caller's knowledge base.
 * Embedding is local (Transformers.js) and retrieval goes through the Atlas
 * vector index, with an exact-cosine fallback while the index is still building.
 */
export async function POST(_req: NextRequest) {
  try {
    const token = await getSessionTokenFromCookies()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyJwt(token)
    const userId = String(payload.sub)

    const body = await _req.json().catch(() => ({}))
    const { query, topK = 3 } = body

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Query string is required' }, { status: 400 })
    }

    const queryVector = await generateEmbedding(query)
    const { hits, engine } = await searchChunks({ userId, queryVector, topK })

    if (hits.length === 0) {
      return NextResponse.json({
        query,
        engine,
        results: [],
        message: 'No documents uploaded in knowledge base yet.',
      })
    }

    return NextResponse.json({
      query,
      engine,
      results: hits.map((hit) => ({
        id: hit.id,
        documentId: hit.documentId,
        text: hit.text,
        similarity: hit.similarity,
      })),
    })
  } catch (error) {
    console.error('[RAG Query] Error:', error)
    const message = error instanceof Error ? error.message : 'Vector query failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
