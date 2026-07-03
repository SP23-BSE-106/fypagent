import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import { encrypt } from '@/lib/crypto'

export async function GET() {
  const token = await getSessionTokenFromCookies()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload
  try {
    payload = verifyJwt(token)
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  const userId = payload.sub
  const db = await getDb()

  const agents = await db
    .collection('agents')
    .find({ userId }, { projection: { userApiKey: 0 } }) // never expose the encrypted key
    .sort({ createdAt: -1 })
    .toArray()

  return NextResponse.json(agents)
}

export async function POST(request: NextRequest) {
  const token = await getSessionTokenFromCookies()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload
  try {
    payload = verifyJwt(token)
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  const userId = payload.sub

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const {
    name,
    description,
    prompt,
    workflow,
    llmProvider,
    userApiKey, // plain-text key supplied by the user — we encrypt before storing
    status = 'draft',
    tags = [],
  } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  // Encrypt the API key only if one was provided
  const encryptedKey = userApiKey?.trim() ? encrypt(userApiKey.trim()) : undefined

  const db = await getDb()
  const now = new Date()

  const result = await db.collection('agents').insertOne({
    userId,
    name: name.trim(),
    description: description?.trim() ?? '',
    prompt: prompt?.trim() ?? '',
    workflow: workflow ?? null,
    llmProvider: llmProvider ?? null,
    userApiKey: encryptedKey ?? null,
    status,
    tags: Array.isArray(tags) ? tags : [],
    createdAt: now,
    updatedAt: now,
  })

  const inserted = await db.collection('agents').findOne(
    { _id: result.insertedId },
    { projection: { userApiKey: 0 } }, // don't return the encrypted key
  )

  return NextResponse.json(inserted, { status: 201 })
}
