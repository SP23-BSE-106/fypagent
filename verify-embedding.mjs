// Verifies local (offline, free) embeddings via Transformers.js
import { pipeline, env } from '@huggingface/transformers'

env.allowLocalModels = false
const t0 = Date.now()
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
  dtype: 'fp32',
  device: 'cpu',
})
console.log(`model loaded in ${Date.now() - t0} ms`)

async function embed(text) {
  const out = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(out.data)
}

const cosine = (a, b) => {
  let d = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return d / (Math.sqrt(na) * Math.sqrt(nb))
}

const a = await embed('What is the probation period policy for new employees?')
const b = await embed('How long is the 90 day probationary period for new hires?')
const c = await embed('What is the company refund policy for subscriptions?')

console.log('dims            :', a.length)
console.log('similar (want ~high):', cosine(a, b).toFixed(4))
console.log('dissimilar (want ~low):', cosine(a, c).toFixed(4))

const ok = a.length === 384 && cosine(a, b) > 0.6 && cosine(a, c) < 0.5
console.log(ok ? 'RESULT: PASS' : 'RESULT: FAIL')

// Compare against the current hash-based fallback to show why it's useless
const hashVec = (text) => {
  const v = new Array(384).fill(0)
  const n = text.toLowerCase().trim()
  for (let i = 0; i < n.length; i++) {
    const cc = n.charCodeAt(i)
    v[(cc * (i + 1) * 31) % 384] += Math.sin(cc) + Math.cos(i)
  }
  const m = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
  return v.map((x) => x / m)
}
console.log('--- current hash fallback (what ships today) ---')
console.log('similar   :', cosine(hashVec(a ? 'What is the probation period policy for new employees?' : ''), hashVec('How long is the 90 day probationary period for new hires?')).toFixed(4))
console.log('dissimilar:', cosine(hashVec('What is the probation period policy for new employees?'), hashVec('What is the company refund policy for subscriptions?')).toFixed(4))
