// Verification for the vector-search layer. Run with: node verify-vector-search.mjs
//
// Checks the two things that can silently rot:
//   1. The vectors persisted in Mongo match what the local model produces for
//      the same text (catches a bad reindex / wrong model / hash fallback).
//   2. Atlas $vectorSearch ranks identically to an exact cosine scan over the
//      same user's chunks, and the 2*score-1 conversion is right.
import fs from 'node:fs'
import { MongoClient } from 'mongodb'
import { pipeline, env } from '@huggingface/transformers'

const envMap = {}
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
  if (m) envMap[m[1]] = m[2].trim()
}

const INDEX = 'agentflow_vector_index'
const QUERY = 'How can I get a refund?'

const cosine = (a, b) => {
  let d = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return d / (Math.sqrt(na) * Math.sqrt(nb))
}

const client = new MongoClient(envMap.MONGODB_URI, { serverSelectionTimeoutMS: 20000 })
await client.connect()
const col = client.db(envMap.MONGODB_DB || 'AgentFlow').collection('rag_chunks')

const owner = await col.findOne({ userId: { $exists: true }, embedding: { $exists: true } })
if (!owner) {
  console.log('No embedded chunks found — upload a document and reindex first.')
  await client.close()
  process.exit(1)
}
const userId = String(owner.userId)

env.cacheDir = fs.realpathSync(process.cwd()) + '/.hf-cache'
const ex = await pipeline('feature-extraction', `${env.cacheDir}/Xenova/all-MiniLM-L6-v2`, {
  dtype: 'fp32',
  device: 'cpu',
})
const embed = async (t) => Array.from((await ex(t, { pooling: 'mean', normalize: true })).data)

let failures = 0

// ── 1. stored vectors must equal a fresh recompute ───────────────────────────
const chunks = await col.find({ userId, embedding: { $exists: true } }).toArray()
let sum = 0
let worst = 1
for (const c of chunks) {
  const s = cosine(c.embedding, await embed(c.text))
  sum += s
  worst = Math.min(worst, s)
}
const mean = sum / chunks.length
const norm = Math.sqrt(chunks[0].embedding.reduce((a, x) => a + x * x, 0))
console.log(`[1] stored vs fresh over ${chunks.length} chunks: mean=${mean.toFixed(6)} worst=${worst.toFixed(6)} |norm[0]|=${norm.toFixed(6)}`)
if (mean < 0.999 || Math.abs(norm - 1) > 1e-3) {
  console.log('    FAIL — stored vectors do not match the model. Run POST /api/rag/reindex.')
  failures++
} else {
  console.log('    PASS')
}

// ── 2. Atlas ranking must match an exact scan ────────────────────────────────
const qv = await embed(QUERY)
const exact = chunks
  .map((c) => ({ ci: c.chunkIndex, s: cosine(qv, c.embedding) }))
  .sort((a, b) => b.s - a.s)
  .slice(0, 3)

const rows = await col
  .aggregate([
    {
      $vectorSearch: {
        index: INDEX,
        path: 'embedding',
        queryVector: qv,
        numCandidates: 100,
        limit: 3,
        filter: { userId },
      },
    },
    { $project: { chunkIndex: 1, score: { $meta: 'vectorSearchScore' } } },
  ])
  .toArray()
  .then((r) => r.map((x) => ({ ci: x.chunkIndex, s: 2 * Number(x.score ?? 0) - 1 })))
  .catch((err) => {
    console.log(`[2] $vectorSearch failed: ${err.message}`)
    return null
  })

if (!rows) {
  console.log('    FAIL — could not query the vector index.')
  failures++
} else {
  console.log(`\n[2] query: "${QUERY}"`)
  console.log('    exact :', exact.map((r) => `ci=${r.ci}@${r.s.toFixed(4)}`).join('  '))
  console.log('    atlas :', rows.map((r) => `ci=${r.ci}@${r.s.toFixed(4)}`).join('  '))
  const sameOrder = exact.length === rows.length && exact.every((r, i) => r.ci === rows[i].ci)
  const sameScores =
    sameOrder && exact.every((r, i) => Math.abs(r.s - rows[i].s) < 1e-3)
  if (sameOrder && sameScores) {
    console.log('    PASS — Atlas ranking and score conversion match exact cosine.')
  } else {
    console.log('    FAIL — Atlas disagrees with exact cosine (index may still be re-ingesting).')
    failures++
  }
}

await client.close()
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
