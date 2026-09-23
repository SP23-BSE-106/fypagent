/**
 * Vector store backed by MongoDB Atlas Vector Search.
 *
 * Atlas `$vectorSearch` does an ANN (HNSW) search over the `embedding` field of
 * `rag_chunks`, filtered per user — instead of the old approach of loading every
 * chunk of a user into memory and scoring them in JavaScript.
 *
 * Two things worth knowing about Atlas scores:
 *   · `vectorSearchScore` = (1 + cosine) / 2, i.e. it lives in [0, 1].
 *     Verified against exact cosine: 0.063042 -> 0.531521.
 *     We convert back to raw cosine with `2 * score - 1` so that both the
 *     vector-search path and the exact fallback report the same number.
 *   · The vector field definition key is `similarity` (singular). Using
 *     `similarities` makes Atlas reject the definition and mark the index
 *     FAILED, which is what happened the first time.
 *
 * If the index is not queryable yet (first build takes ~35s, or the cluster
 * does not support Atlas Search at all) we transparently fall back to an exact
 * cosine scan, so retrieval stays correct — just slower — while the index warms.
 */

import { getDb } from '@/lib/mongo/mongo'
import { cosineSimilarity, EMBEDDING_DIMENSION, EMBEDDING_MODEL } from './embeddings'

export const VECTOR_INDEX_NAME = 'agentflow_vector_index'
const CHUNKS_COLLECTION = 'rag_chunks'

export type VectorIndexStatus =
  | 'READY' // queryable, correct dimensions
  | 'PENDING' // created / still building
  | 'FAILED' // rejected definition or wrong dimensions -> needs rebuild
  | 'MISSING' // no index yet
  | 'UNSUPPORTED' // cluster rejected Atlas Search entirely

export interface ChunkHit {
  id: string
  documentId: string
  text: string
  chunkIndex: number
  /** Raw cosine similarity in [-1, 1]. */
  similarity: number
}

export interface SearchOutcome {
  hits: ChunkHit[]
  /** Which engine answered: the ANN index, or the exact scan fallback. */
  engine: 'vector-search' | 'exact-cosine'
}

const INDEX_CACHE_TTL_MS = 30_000
const INDEX_BUILD_TIMEOUT_MS = 90_000

let cachedStatus: { value: VectorIndexStatus; at: number } | null = null
let ensureInFlight: Promise<VectorIndexStatus> | null = null

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Read the current index state straight from Atlas (no cache). */
async function readIndexStatus(): Promise<VectorIndexStatus> {
  try {
    const db = await getDb()
    // The driver types this loosely ({ name: string }); Atlas actually returns
    // status/queryable/latestDefinition alongside it.
    const indexes = (await db
      .collection(CHUNKS_COLLECTION)
      .listSearchIndexes()
      .toArray()) as unknown as Array<{
      name: string
      status?: string
      queryable?: boolean
      latestDefinition?: { fields?: Array<{ type?: string; numDimensions?: number }> }
    }>
    const mine = indexes.find((i) => i.name === VECTOR_INDEX_NAME)

    if (!mine) return 'MISSING'

    const status = String(mine.status || '').toUpperCase()
    const queryable = mine.queryable === true

    if (queryable || status === 'READY') {
      // A READY index with the wrong dimensionality can never match our
      // vectors, so treat it as broken and rebuild it.
      const fields = mine.latestDefinition?.fields ?? []
      const vectorField = fields.find((f) => f.type === 'vector')
      const declared = vectorField?.numDimensions
      if (typeof declared === 'number' && declared !== EMBEDDING_DIMENSION) {
        return 'FAILED'
      }
      return 'READY'
    }

    if (status === 'FAILED' || status === 'DELETING' || status === 'DROPPED') return 'FAILED'
    if (status === 'PENDING' || status === 'BUILDING' || status === 'UPDATING') return 'PENDING'

    return 'PENDING'
  } catch (err) {
    // e.g. a cluster/tier where $listSearchIndexes is unavailable.
    console.warn('[vectorStore] Unable to read vector index status:', err)
    return 'UNSUPPORTED'
  }
}

/** Cached index status; avoids hitting Atlas on every single query. */
export async function getIndexStatus(options: { refresh?: boolean } = {}): Promise<VectorIndexStatus> {
  if (!options.refresh && cachedStatus && Date.now() - cachedStatus.at < INDEX_CACHE_TTL_MS) {
    return cachedStatus.value
  }

  const value = await readIndexStatus()
  cachedStatus = { value, at: Date.now() }
  return value
}

function invalidateStatusCache(): void {
  cachedStatus = null
}

async function doEnsureVectorIndex(): Promise<VectorIndexStatus> {
  const db = await getDb()
  const collection = db.collection(CHUNKS_COLLECTION)

  let status = await readIndexStatus()
  if (status === 'READY' || status === 'UNSUPPORTED') {
    invalidateStatusCache()
    return status
  }

  // Drop a rejected/mis-dimensioned index before recreating it.
  if (status === 'FAILED') {
    try {
      await collection.dropSearchIndex(VECTOR_INDEX_NAME)
      console.log('[vectorStore] Dropped unusable vector index for rebuild')
    } catch (err) {
      console.warn('[vectorStore] Could not drop old vector index:', err)
    }
    invalidateStatusCache()
    status = 'MISSING'
  }

  if (status === 'MISSING') {
    try {
      await collection.createSearchIndex({
        name: VECTOR_INDEX_NAME,
        type: 'vectorSearch',
        definition: {
          fields: [
            {
              type: 'vector',
              path: 'embedding',
              numDimensions: EMBEDDING_DIMENSION,
              similarity: 'cosine',
            },
            { type: 'filter', path: 'userId' },
            { type: 'filter', path: 'documentId' },
          ],
        },
      })
      console.log(`[vectorStore] Created vector index "${VECTOR_INDEX_NAME}" (${EMBEDDING_DIMENSION} dims)`)
      invalidateStatusCache()
      status = 'PENDING'
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[vectorStore] createSearchIndex rejected, will use exact search: ${message}`)
      invalidateStatusCache()
      return 'UNSUPPORTED'
    }
  }

  // Wait for the build so the caller can use ANN straight away when possible.
  const deadline = Date.now() + INDEX_BUILD_TIMEOUT_MS
  while (Date.now() < deadline) {
    await sleep(3000)
    status = await readIndexStatus()
    invalidateStatusCache()
    if (status === 'READY' || status === 'FAILED' || status === 'UNSUPPORTED') break
  }

  console.log(`[vectorStore] Vector index status after ensure: ${status}`)
  return status
}

/** Create the vector index if needed and wait (up to ~90s) for it to build. */
export function ensureVectorIndex(): Promise<VectorIndexStatus> {
  if (!ensureInFlight) {
    ensureInFlight = doEnsureVectorIndex().finally(() => {
      ensureInFlight = null
    })
  }
  return ensureInFlight
}

/** Fire-and-forget variant: never blocks or fails the caller's request. */
export function kickOffIndexBuild(): void {
  void ensureVectorIndex().catch((err) => {
    console.warn('[vectorStore] Background index build failed:', err)
  })
}

interface RawChunk {
  _id: unknown
  documentId?: unknown
  text?: unknown
  chunkIndex?: unknown
  embedding?: unknown
}

function toHit(chunk: RawChunk, similarity: number): ChunkHit {
  return {
    id: String(chunk._id),
    documentId: String(chunk.documentId ?? ''),
    text: String(chunk.text ?? ''),
    chunkIndex: typeof chunk.chunkIndex === 'number' ? chunk.chunkIndex : 0,
    similarity,
  }
}

function usableEmbedding(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === EMBEDDING_DIMENSION && value.every((v) => typeof v === 'number')
}

/** Exact cosine scan over the user's chunks — correct, just O(n). */
async function exactCosineSearch(
  userId: string,
  queryVector: number[],
  topK: number
): Promise<ChunkHit[]> {
  const db = await getDb()
  const chunks = (await db
    .collection(CHUNKS_COLLECTION)
    .find({ userId, embedding: { $exists: true } })
    .toArray()) as unknown as RawChunk[]

  return chunks
    .filter((chunk) => usableEmbedding(chunk.embedding))
    .map((chunk) => toHit(chunk, cosineSimilarity(queryVector, chunk.embedding as number[])))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
}

/**
 * Retrieve the top-K chunks for a query vector, scoped to one user.
 * Uses Atlas ANN when the index is queryable, otherwise exact cosine.
 */
export async function searchChunks(options: {
  userId: string
  queryVector: number[]
  topK?: number
}): Promise<SearchOutcome> {
  const userId = String(options.userId)
  const topK = Math.max(1, Math.min(options.topK ?? 3, 50))

  const status = await getIndexStatus()

  if (status === 'MISSING' || status === 'FAILED') {
    // Warm the index for next time, but answer this request immediately.
    kickOffIndexBuild()
  }

  if (status === 'READY') {
    try {
      const db = await getDb()
      const rows = (await db
        .collection(CHUNKS_COLLECTION)
        .aggregate([
          {
            $vectorSearch: {
              index: VECTOR_INDEX_NAME,
              path: 'embedding',
              queryVector: options.queryVector,
              numCandidates: Math.max(topK * 20, 100),
              limit: topK,
              filter: { userId },
            },
          },
          {
            $project: {
              documentId: 1,
              text: 1,
              chunkIndex: 1,
              score: { $meta: 'vectorSearchScore' },
            },
          },
        ])
        .toArray()) as unknown as Array<RawChunk & { score?: number }>

      const hits = rows
        .map((row) => toHit(row, 2 * Number(row.score ?? 0) - 1))
        .sort((a, b) => b.similarity - a.similarity)

      // An empty ANN result right after an upload means the index has not
      // picked the new documents up yet — fall back so nothing is missed.
      if (hits.length > 0) {
        return { hits, engine: 'vector-search' }
      }
    } catch (err) {
      console.warn('[vectorStore] $vectorSearch failed, falling back to exact cosine:', err)
    }
  }

  return { hits: await exactCosineSearch(userId, options.queryVector, topK), engine: 'exact-cosine' }
}

/** Count chunks that were never embedded, or embedded with a different model/dim. */
export async function countStaleEmbeddings(userId: string): Promise<{ total: number; fresh: number }> {
  const db = await getDb()
  const collection = db.collection(CHUNKS_COLLECTION)

  const total = await collection.countDocuments({ userId })
  const fresh = await collection.countDocuments({
    userId,
    embeddingModel: EMBEDDING_MODEL,
    embedding: { $size: EMBEDDING_DIMENSION },
  })

  return { total, fresh }
}
