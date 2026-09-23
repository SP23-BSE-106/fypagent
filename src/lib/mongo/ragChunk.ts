export type RagChunk = {
  _id?: string
  /** Owning user — required so vector search can filter per user. */
  userId?: string
  documentId: string
  chunkIndex: number
  /** Chunk text to embed/search */
  text: string

  /**
   * Store embedding as an array (implementation depends on your embedding provider)
   * or store an external reference.
   */
  embedding?: number[]
  /** Model that produced `embedding`, e.g. "Xenova/all-MiniLM-L6-v2". */
  embeddingModel?: string
  embeddingRef?: {
    provider?: string
    vectorId?: string
    [key: string]: unknown
  }

  createdAt: Date
  reindexedAt?: Date
}

