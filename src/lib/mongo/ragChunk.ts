export type RagChunk = {
  _id?: string
  documentId: string
  chunkIndex: number
  /** Chunk text to embed/search */
  text: string

  /**
   * Store embedding as an array (implementation depends on your embedding provider)
   * or store an external reference.
   */
  embedding?: number[]
  embeddingRef?: {
    provider?: string
    vectorId?: string
    [key: string]: unknown
  }

  createdAt: Date
}

