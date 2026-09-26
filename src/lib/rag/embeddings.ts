/**
 * Local embedding model for the RAG pipeline (Transformers.js + ONNX Runtime).
 *
 * Why local instead of an API:
 * none of the keys in .env.local can serve embeddings —
 *   · Vercel AI Gateway  -> HTTP 403 (no credit card on file)
 *   · NVIDIA              -> embedding models EOL (HTTP 410)
 *   · HuggingFace router  -> HTTP 404 (no /v1/embeddings; 0 embed models listed)
 *   · Moonshot / Kimi     -> no MOONSHOT_API_KEY / KIMI_API_KEY at all
 * The previous implementation therefore fell through to a deterministic hash
 * vector *silently*, which made retrieval meaningless: unrelated text scored
 * ~0.30 cosine while related text scored ~0.01 (i.e. ranking was inverted).
 * There is deliberately no fallback here — failing loudly beats returning a
 * fake vector that poisons the whole knowledge base.
 *
 * Model: Xenova/all-MiniLM-L6-v2 — 384-dim, ~90MB, ~8ms/call on CPU.
 * Weights are downloaded once and cached in .hf-cache/ (kept out of
 * node_modules so `npm install` does not wipe them) — or in `/tmp/.hf-cache`
 * on Vercel, where the project directory is read-only and gitignored files
 * are not deployed at all. See CACHE_DIR.
 */

import fs from 'node:fs'
import path from 'node:path'
// Type-only, so it is erased at compile time and pulls in no runtime module.
// The runtime import of this package happens lazily inside getExtractor() —
// see the note there. Importing it statically here made every file that
// touched this module fail to *load* on Vercel, which took down all of
// /api/rag/* with a bare HTML 500 before any handler could run.
import type { FeatureExtractionPipeline } from '@huggingface/transformers'

export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2'
export const EMBEDDING_DIMENSION = 384

/**
 * Weights live outside node_modules so `npm install` does not wipe them.
 *
 * On Vercel the project directory is read-only (only `/tmp` is writable) and
 * `.hf-cache/` is gitignored, so its 86.9 MB of weights are never deployed.
 * Pointing at `/tmp/.hf-cache` lets the loader download the model at runtime
 * and keep it across warm invocations of the same instance. Locally nothing
 * changes — we keep the pinned project-local cache.
 */
const CACHE_DIR = process.env.VERCEL
  ? path.join('/tmp', '.hf-cache')
  : path.join(process.cwd(), '.hf-cache')

/**
 * Decide how to address the model: an absolute directory, or the hub id.
 *
 * An absolute directory is preferred because it removes any need for the
 * loader to consult `env.localModelPath` (which defaults to the *package's*
 * own `models/` folder, not our cache) or to fall back to `env.fetch`. In
 * `next dev` that global fetch is Next's patched version, so a remote
 * fallback answers with the dev server's own payload instead of a model file.
 *
 * The heavier failure, though, was local: see `installExactBufferReads` below.
 */
function resolveModelSource(): string {
  const localDir = path.join(CACHE_DIR, ...EMBEDDING_MODEL.split('/'))
  const hasWeights =
    fs.existsSync(path.join(localDir, 'config.json')) &&
    fs.existsSync(path.join(localDir, 'onnx', 'model.onnx'))

  // Nothing cached yet (fresh clone) -> use the hub id so it downloads into
  // CACHE_DIR first. Once the weights exist, always load them from disk.
  return hasWeights ? localDir : EMBEDDING_MODEL
}

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null

/**
 * Work around a bug in transformers.js `FileResponse.arrayBuffer()`:
 *
 *     const data = await fs.promises.readFile(this.filePath)
 *     return data.buffer          // ← the Buffer's whole backing store
 *
 * Node serves small reads out of a shared 8 KB Buffer pool, so config.json
 * (650 bytes) comes back as a *view* into that pool — measured in the running
 * dev server as `byteLength=8192, byteOffset=4680`. `.buffer` therefore
 * returns the entire pool, whose other slots hold unrelated live data. We
 * observed MongoDB wire bytes (`topologyVersion`, `...mongodb.net:27017`) and
 * Next.js flight payloads (`64:I["[project]/...`) being handed to `JSON.parse`
 * as `config.json`, always ~8192 bytes and always at a different offset —
 * which is exactly why the reported error position varied on every attempt.
 *
 * Returning an unsliced Buffer for files under CACHE_DIR makes `.buffer` equal
 * the file's own bytes. Everything outside the cache dir is passed through
 * untouched, so the rest of the process keeps its normal fast path.
 */
function installExactBufferReads(): void {
  const promises = fs.promises as unknown as {
    readFile: (...args: unknown[]) => Promise<unknown>
    __afExactBuffer?: boolean
  }
  if (promises.__afExactBuffer) return
  promises.__afExactBuffer = true

  const original = promises.readFile.bind(fs.promises)

  promises.readFile = async (...args: unknown[]) => {
    const out = await original(...args)
    const file = typeof args[0] === 'string' ? args[0] : ''
    const isPooledView =
      Buffer.isBuffer(out) &&
      (out.byteOffset !== 0 || out.buffer.byteLength !== out.length)

    if (isPooledView && file.startsWith(CACHE_DIR)) {
      const exact = Buffer.alloc(out.length)
      out.copy(exact)
      return exact
    }
    return out
  }
}

/**
 * Singleton model loader. The promise is memoised so N chunks in one upload
 * share a single load; a failed load is evicted so the next request retries
 * (e.g. a transient download failure) instead of being stuck forever.
 */
function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    const source = resolveModelSource()
    installExactBufferReads()

    extractorPromise = (async () => {
      /**
       * Deliberately a dynamic import.
       *
       * `@huggingface/transformers` opens with a top-level
       * `import sharp from "sharp"` (dist/transformers.node.mjs:18832), so a
       * *static* import of this package dlopens libvips during module
       * evaluation. On Vercel the traced bundle was missing that shared
       * library, so the import threw ERR_DLOPEN_FAILED at load time — and
       * because status/query/chat/upload/reindex all reach this file, the
       * entire /api/rag/* route failed to load and Next answered every path
       * under it (including a plain 404 probe) with an opaque HTML 500.
       *
       * Deferring the import to here means only the code paths that actually
       * embed text pay for it. /api/rag/status needs just two constants and
       * never touches the model, so it now loads regardless — and if the
       * native module really is unavailable, this rejects as an ordinary
       * promise that the caller's catch block reports as JSON instead of
       * collapsing the whole route.
       */
      const { env, pipeline } = await import('@huggingface/transformers')
      env.cacheDir = CACHE_DIR
      return pipeline('feature-extraction', source, { dtype: 'fp32', device: 'cpu' })
    })().catch((err: unknown) => {
      extractorPromise = null
      const message = err instanceof Error ? err.message : String(err)
      console.error(
        `[embeddings] Failed to load ${EMBEDDING_MODEL} from ${source} (cwd=${process.cwd()}): ${message}`
      )
      throw err
    })
  }
  return extractorPromise
}

/** Warm the model in the background so the first request does not pay the load cost. */
export function warmUpEmbeddingModel(): void {
  void getExtractor().catch(() => {
    /* logged by the caller that actually uses it */
  })
}

/**
 * Embed a single text into a unit-normalised 384-dim vector.
 * Throws if the model cannot be loaded or produces an invalid vector.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const input = typeof text === 'string' ? text.trim() : ''
  if (!input) {
    throw new Error('Cannot generate an embedding for empty text')
  }

  const extractor = await getExtractor()

  let vector: number[]
  try {
    const output = await extractor(input, { pooling: 'mean', normalize: true })
    vector = Array.from(output.data as Float32Array)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Embedding generation failed (${EMBEDDING_MODEL}): ${message}`)
  }

  if (vector.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSION}, received ${vector.length}`
    )
  }
  if (!vector.every((v) => typeof v === 'number' && Number.isFinite(v))) {
    throw new Error('Embedding contains non-finite values')
  }

  return vector
}

/** Cosine similarity between two vectors, in [-1, 1]. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) {
    return 0
  }

  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    dot += x * y
    normA += x * x
    normB += y * y
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dot / denominator
}
