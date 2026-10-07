import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'

import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import {
  cleanAgentName,
  isDuplicateAgentName,
  isUsableAgentName,
  normalizeAgentName,
} from '@/lib/agentName'
import { listTakenNames, ensureAgentNameIndex, repairLegacyDuplicateNames } from '@/lib/agentNameStore'

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
  const settings = await db.collection('workspace_settings').findOne({ userId })
  if (settings?.permissions?.canEditWorkflows === false) {
    return NextResponse.json({ error: 'Workflow editing permission is disabled for this workspace.' }, { status: 403 })
  }

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
  const settings = await db.collection('workspace_settings').findOne({ userId })
  if (settings?.permissions?.canEditWorkflows === false) {
    return NextResponse.json({ error: 'Workflow editing permission is disabled for this workspace.' }, { status: 403 })
  }

  // A rename goes through the same rules as a create — otherwise renaming one
  // agent onto another would quietly break the "no two agents share a name"
  // guarantee that POST enforces.
  if ('name' in update) {
    const requested = cleanAgentName(update.name)

    if (!requested) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (!isUsableAgentName(requested)) {
      return NextResponse.json(
        { error: 'Agent names must contain letters or numbers.' },
        { status: 400 },
      )
    }

    // Repaired names must be visible before we compare, otherwise a rename
    // could be judged against a list that is about to change.
    await ensureAgentNameIndex(db)
    await repairLegacyDuplicateNames(db, userId)
    const taken = await listTakenNames(db, userId, id)

    const clash = taken.find((existing) => isDuplicateAgentName(existing, requested))
    if (clash) {
      return NextResponse.json(
        {
          error: `You already have an agent named "${clash}". Choose a different name.`,
          existingName: clash,
        },
        { status: 409 },
      )
    }

    update.name = requested
    update.nameNormalized = normalizeAgentName(requested)
  }

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
