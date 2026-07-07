import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'

import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'

async function getAuthenticatedUserId() {
  const token = await getSessionTokenFromCookies()
  if (!token) return null
  try {
    const payload = verifyJwt(token)
    return payload.sub
  } catch {
    return null
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 })
  }

  const db = await getDb()
  const agent = await db
    .collection('agents')
    .findOne(
      { _id: new ObjectId(id), userId },
      { projection: { userApiKey: 0 } },
    )

  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(agent)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 })
  }

  const db = await getDb()
  const result = await db
    .collection('agents')
    .deleteOne({ _id: new ObjectId(id), userId })

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Not found or not authorised to delete' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  // Only allow updating safe fields
  const allowed = ['name', 'description', 'status', 'tags', 'llmProvider', 'prompt', 'workflow', 'userApiKey']
  const update: Record<string, unknown> = { updatedAt: new Date() }
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const db = await getDb()
  const result = await db
    .collection('agents')
    .findOneAndUpdate(
      { _id: new ObjectId(id), userId },
      { $set: update },
      { returnDocument: 'after', projection: { userApiKey: 0 } },
    )

  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(result)
}
