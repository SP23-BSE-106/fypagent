/**
 * Embeddings Vector Generator & Cosine Similarity Engine
 * Configured to use Kimi (Moonshot AI API / OpenAI Compatible API) or fallback TF-IDF vectorizer.
 */

export const EMBEDDING_DIMENSION = 384

/**
 * Generate embedding vector using Moonshot/Kimi API or local deterministic hash vector fallback.
 * Note: HuggingFace router doesn't support embeddings, so we use Moonshot as primary.
 */
export async function generateEmbedding(text: string, kimiApiKey?: string): Promise<number[]> {
  const apiKey = kimiApiKey || process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY

  if (apiKey) {
    try {
      // Try Moonshot / Kimi API embedding call (OpenAI format compatible)
      console.log('[embeddings] Attempting Moonshot API for embeddings...')
      const res = await fetch('https://api.moonshot.cn/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'moonshot-v1-8k',
          input: text,
        }),
        signal: AbortSignal.timeout(30_000),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.data?.[0]?.embedding) {
          console.log('[embeddings] Moonshot embedding succeeded')
          return data.data[0].embedding
        }
      } else {
        console.warn(`[embeddings] Moonshot returned ${res.status}, using local fallback`)
      }
    } catch (error) {
      console.warn('[embeddings] Moonshot API call failed, falling back to local vector generator:', error)
    }
  }

  // Fast, deterministic fallback vector generator for local testing without active API credits
  console.log('[embeddings] Using deterministic local vector generator')
  return generateDeterministicVector(text, EMBEDDING_DIMENSION)
}

/**
 * Computes Cosine Similarity between two embedding vectors (-1 to 1)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Deterministic vector generator for development & offline environments
 */
function generateDeterministicVector(text: string, dimensions: number): number[] {
  const vector = new Array(dimensions).fill(0)
  const normalized = text.toLowerCase().trim()

  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i)
    const index = (charCode * (i + 1) * 31) % dimensions
    vector[index] += Math.sin(charCode) + Math.cos(i)
  }

  // Normalize vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  if (magnitude === 0) return vector

  return vector.map((val) => val / magnitude)
}
