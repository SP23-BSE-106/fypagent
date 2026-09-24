import { NextResponse } from 'next/server'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import { getDb } from '@/lib/mongo/mongo'
import { generateEmbedding, EMBEDDING_MODEL, EMBEDDING_DIMENSION } from '@/lib/rag/embeddings'
import { ensureVectorIndex } from '@/lib/rag/vectorStore'

/**
 * POST /api/rag/reindex
 *
 * Rebuild every embedding for the current user with the current model.
 *
 * Why this exists: chunks written before the embedding fix carry hash-based
 * (garbage) vectors, or vectors from a different model/dimension. Their text is
 * fine — only the vectors are bad — so re-embedding in place is enough; there
 * is no need to re-upload the original files.
 *
 * Also (re)creates the Atlas vector index if it is missing or unusable.
 */
export async function POST() {
  try {
    const token = await getSessionTokenFromCookies()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyJwt(token)
    const userId = String(payload.sub)

    const db = await getDb()
    const chunks = db.collection('rag_chunks')

    const allChunks = await chunks.find({ userId }).toArray()
    if (allChunks.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        reindexed: 0,
        message: 'Knowledge base is empty — nothing to reindex yet.',
      })
    }

    console.log(`[RAG Reindex] Re-embedding ${allChunks.length} chunk(s) with ${EMBEDDING_MODEL}`)

    let reindexed = 0
    const ops: { updateOne: { filter: object; update: object } }[] = []

    for (const [i, chunk] of allChunks.entries()) {
      const text = String(chunk.text ?? '').trim()
      if (!text) continue

      try {
        const embedding = await generateEmbedding(text)
        ops.push({
          updateOne: {
            filter: { _id: chunk._id },
            update: {
              $set: {
                embedding,
                embeddingModel: EMBEDDING_MODEL,
                reindexedAt: new Date(),
              },
            },
          },
        })
        reindexed++
      } catch (err) {
        console.error(`[RAG Reindex] Failed on chunk ${i} (${chunk._id}):`, err)
        throw err
      }
    }

    if (ops.length > 0) {
      const result = await chunks.bulkWrite(ops as never, { ordered: false })
      console.log(`[RAG Reindex] Modified ${result.modifiedCount} chunk document(s)`)
    }

    // Rebuild/repair the vector index with the current dimensionality.
    const vectorIndex = await ensureVectorIndex()

    return NextResponse.json({
      success: true,
      total: allChunks.length,
      reindexed,
      embedding_model: EMBEDDING_MODEL,
      embedding_dimension: EMBEDDING_DIMENSION,
      vector_index: vectorIndex,
      message: `Re-embedded ${reindexed} chunk(s). Vector index: ${vectorIndex}.`,
    })
  } catch (error) {
    console.error('[RAG Reindex] Error:', error)
    const message = error instanceof Error ? error.message : 'Reindex failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
