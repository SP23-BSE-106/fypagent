import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import { EMBEDDING_DIMENSION, EMBEDDING_MODEL } from '@/lib/rag/embeddings'
import { countStaleEmbeddings, getIndexStatus, VECTOR_INDEX_NAME } from '@/lib/rag/vectorStore'

/**
 * GET /api/rag/status
 *
 * Diagnostic endpoint to check knowledge base status for current user,
 * including the state of the Atlas vector index and whether any stored
 * embeddings are stale (written by a different model, or never written).
 */
export async function GET() {
  try {
    const token = await getSessionTokenFromCookies()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyJwt(token)
    const userId = String(payload.sub)

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

    const { total, fresh } = await countStaleEmbeddings(userId)
    const vectorIndex = await getIndexStatus({ refresh: true })

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
        })),
        // Embedding / vector index health
        embedding_model: EMBEDDING_MODEL,
        embedding_dimension: EMBEDDING_DIMENSION,
        vector_index: {
          name: VECTOR_INDEX_NAME,
          state: vectorIndex,
          queryable: vectorIndex === 'READY'
        },
        stale_embeddings: total - fresh,
      }
    })
  } catch (error) {
    console.error('[RAG Status] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to read knowledge base status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
