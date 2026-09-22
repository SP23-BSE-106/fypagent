/**
 * Text Chunker Helper for RAG Module
 * Segments document text into search-optimized chunks with token overlap.
 */

export interface ChunkOptions {
  chunkSize?: number // Max characters per chunk (default: 500)
  overlap?: number   // Overlap characters between chunks (default: 50)
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const chunkSize = options.chunkSize || 500
  const overlap = options.overlap || 50

  if (!text || text.trim().length === 0) return []
  if (text.length <= chunkSize) return [text.trim()]

  const chunks: string[] = []
  let startIndex = 0

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize

    // Try to break at a sentence or word boundary instead of arbitrary character
    if (endIndex < text.length) {
      const lastPeriod = text.lastIndexOf('.', endIndex)
      const lastNewline = text.lastIndexOf('\n', endIndex)
      const lastSpace = text.lastIndexOf(' ', endIndex)

      const boundary = Math.max(lastPeriod, lastNewline, lastSpace)
      if (boundary > startIndex + chunkSize * 0.5) {
        endIndex = boundary + 1
      }
    }

    const chunk = text.slice(startIndex, endIndex).trim()
    if (chunk.length > 0) {
      chunks.push(chunk)
    }

    startIndex = endIndex - overlap
    if (startIndex >= text.length - overlap) break
  }

  return chunks
}
