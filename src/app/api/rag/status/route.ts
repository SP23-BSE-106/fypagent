import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'

/**
 * GET /api/rag/status
 * 
 * Diagnostic endpoint to check knowledge base status for current user
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getSessionTokenFromCookies()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyJwt(token)
    const userId = payload.sub

    const db = await getDb()

    // Get document count
    const docCount = await db.collection('rag_documents').countDocuments({ userId })
    
    // Get chunk count
    const chunkCount = await db.collection('rag_chunks').countDocuments({ userId })

    // Get sample chunks to verify they have embeddings
    const sampleChunks = await db
      .collection('rag_chunks')
      .find({ userId })
      .limit(3)
      .toArray()

    const documents = await db
      .collection('rag_documents')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      status: 'ok',
      userId,
      knowledge_base: {
        documents: docCount,
        chunks: chunkCount,
        documents_list: documents.map(d => ({
          id: d._id.toString(),
          name: d.name,
          createdAt: d.createdAt
        })),
        sample_chunks: sampleChunks.map(c => ({
          id: c._id.toString(),
          documentId: c.documentId,
          text: c.text.slice(0, 100) + '...',
          has_embedding: !!c.embedding && Array.isArray(c.embedding) && c.embedding.length > 0
        }))
      }
    })
  } catch (error: any) {
    console.error('RAG Status Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check RAG status' },
      { status: 500 }
    )
  }
}
