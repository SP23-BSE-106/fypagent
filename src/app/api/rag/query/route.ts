import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import { generateEmbedding, cosineSimilarity } from '@/lib/rag/embeddings'

export async function POST(req: NextRequest) {
  try {
    const token = await getSessionTokenFromCookies()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyJwt(token)
    const userId = payload.sub

    const body = await req.json().catch(() => ({}))
    const { query, topK = 3 } = body

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Query string is required' }, { status: 400 })
    }

    const kimiApiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY

    // 1. Generate query vector
    const queryVector = await generateEmbedding(query, kimiApiKey)

    // 2. Fetch user's chunks from MongoDB
    const db = await getDb()
    const chunks = await db.collection('rag_chunks').find({ userId }).toArray()

    if (chunks.length === 0) {
      return NextResponse.json({
        query,
        results: [],
        message: 'No documents uploaded in knowledge base yet.',
      })
    }

    // 3. Compute cosine similarity for each chunk
    const scoredChunks = chunks
      .map((chunk) => {
        const similarity = chunk.embedding
          ? cosineSimilarity(queryVector, chunk.embedding)
          : 0
        return {
          id: chunk._id.toString(),
          documentId: chunk.documentId,
          text: chunk.text,
          similarity,
        }
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)

    return NextResponse.json({
      query,
      results: scoredChunks,
    })
  } catch (error: any) {
    console.error('RAG Query Error:', error)
    return NextResponse.json({ error: error.message || 'RAG query search failed' }, { status: 500 })
  }
}
