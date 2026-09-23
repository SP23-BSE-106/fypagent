// End-to-end test of the rebuilt RAG pipeline against the running dev server.
// Mints a real session JWT, then exercises status -> reindex -> query -> chat.
import fs from 'node:fs'
import crypto from 'node:crypto'

const env = {}
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const COOKIE_NAME = env.SESSION_COOKIE_NAME || 'agentflow_session'

const b64url = (buf) => Buffer.from(buf).toString('base64url')

// Same construction as src/lib/auth/jwt.ts signJwt()
function signJwt(sub, email, fullName) {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 3600
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify({ sub, email, fullName, iat, exp, iss: 'agentflow' }))
  const data = `${header}.${body}`
  const sig = crypto.createHmac('sha256', env.JWT_SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

const { MongoClient, ObjectId } = await import('mongodb')
const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 })
await client.connect()
const db = client.db(env.MONGODB_DB || 'AgentFlow')

// Use the user that already owns the policy document chunks.
const chunkOwner = await db.collection('rag_chunks').findOne({ userId: { $exists: true } })
const userId = String(chunkOwner?.userId)
const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
const email = user?.email || 'tester@agentflow.local'
const fullName = user?.fullName || 'E2E Tester'
console.log(`acting as userId=${userId} email=${email} (owner of existing chunks)`)

const cookie = `${COOKIE_NAME}=${signJwt(userId, email, fullName)}`
const api = (path, init = {}) =>
  fetch(BASE + path, {
    ...init,
    headers: { ...(init.headers || {}), cookie, ...(init.body ? { 'content-type': 'application/json' } : {}) },
  })

const line = (s) => console.log(`\n===== ${s} =====`)

// ── 1. status ───────────────────────────────────────────────────────────────
line('1. GET /api/rag/status')
const st = await (await api('/api/rag/status')).json()
console.log(
  JSON.stringify(
    {
      documents: st.knowledge_base?.documents,
      chunks: st.knowledge_base?.chunks,
      embedding_model: st.knowledge_base?.embedding_model,
      dims: st.knowledge_base?.embedding_dimension,
      vector_index: st.knowledge_base?.vector_index,
      stale_embeddings: st.knowledge_base?.stale_embeddings,
    },
    null,
    1
  )
)
const staleBefore = st.knowledge_base?.stale_embeddings ?? 0

// ── 2. reindex (repairs the hash-garbage vectors) ───────────────────────────
line('2. POST /api/rag/reindex')
const tR = Date.now()
const riRes = await api('/api/rag/reindex', { method: 'POST' })
const ri = await riRes.json()
console.log(`http=${riRes.status} in ${Date.now() - tR}ms`)
console.log(JSON.stringify(ri, null, 1))

// ── 3. status again: stale should be 0, index should be READY ───────────────
line('3. GET /api/rag/status (after reindex)')
const st2 = await (await api('/api/rag/status')).json()
const kb = st2.knowledge_base
console.log(
  JSON.stringify(
    {
      chunks: kb?.chunks,
      vector_index: kb?.vector_index,
      stale_embeddings: kb?.stale_embeddings,
    },
    null,
    1
  )
)

// ── 4. semantic query ───────────────────────────────────────────────────────
line('4. POST /api/rag/query')
const questions = [
  'How can I get a refund?',
  'What are the support response times?',
  'How much does the Pro plan cost?',
]
for (const q of questions) {
  const res = await api('/api/rag/query', { method: 'POST', body: JSON.stringify({ query: q, topK: 3 }) })
  const data = await res.json()
  if (!res.ok) {
    console.log(`Q: ${q}\n  HTTP ${res.status}: ${data.error}`)
    continue
  }
  console.log(`Q: ${q}   [engine=${data.engine}]`)
  for (const [i, r] of (data.results || []).entries()) {
    const pct = ((r.similarity + 1) / 2) * 100 // what the UI prints as "% Match"
    console.log(
      `   #${i + 1} cosine=${Number(r.similarity).toFixed(4)} uiMatch=${pct.toFixed(1)}% "${String(r.text).replace(/\n/g, ' ').slice(0, 78)}..."`
    )
  }
}

// ── 5. RAG chat ─────────────────────────────────────────────────────────────
line('5. POST /api/rag/chat')
const tC = Date.now()
const chatRes = await api('/api/rag/chat', {
  method: 'POST',
  body: JSON.stringify({ question: 'What is the refund policy?', topK: 3 }),
})
const chat = await chatRes.json()
console.log(`http=${chatRes.status} in ${Date.now() - tC}ms`)
console.log('sources:', (chat.sources || []).length)
for (const s of chat.sources || []) {
  console.log(`   cosine=${Number(s.similarity).toFixed(4)} "${String(s.text).replace(/\n/g, ' ').slice(0, 78)}..."`)
}
console.log('answer:', String(chat.answer || '').slice(0, 700))

await client.close()
console.log(`\nSTALE BEFORE=${staleBefore} AFTER=${st2.knowledge_base?.stale_embeddings}`)
