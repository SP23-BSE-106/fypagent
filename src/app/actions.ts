'use server'

import { rateLimit } from '@/lib/rateLimit'
import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'

export async function saveApiKey(provider: string, key: string) {
  const rlKey = `saveApiKey:${provider}`
  const rl = rateLimit(rlKey, { windowMs: 60_000, max: 5 })
  if (!rl.ok) {
    throw new Error(`Too many requests. Retry after ${rl.retryAfterMs}ms`)
  }

  const token = await getSessionTokenFromCookies()
  if (!token) throw new Error('Not logged in')

  const payload = verifyJwt(token)
  const userId = payload.sub

  const db = await getDb()

  await db.collection('api_keys').updateOne(
    { userId, provider },
    { $set: { encryptedKey: key, createdAt: new Date() } },
    { upsert: true },
  )

  return { success: true }
}


