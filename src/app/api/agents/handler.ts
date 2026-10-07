import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import { encrypt } from '@/lib/crypto'
import {
  agentNameFromPrompt,
  cleanAgentName,
  isDuplicateAgentName,
  isUsableAgentName,
  nextAvailableAgentName,
  normalizeAgentName,
} from '@/lib/agentName'
import {
  ensureAgentNameIndex,
  isDuplicateKeyError,
  listTakenNames,
  repairLegacyDuplicateNames,
} from '@/lib/agentNameStore'

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
    // Set by callers that never showed the user a name field (the builder's
    // autosave). Those accept a numbered variant instead of failing the save.
    autoName = false,
  } = body

  // No usable name from the caller: derive one rather than storing "Untitled".
  // Chain is name → readable summary of the prompt → the prompt itself → error.
  const source = cleanAgentName(prompt) || cleanAgentName(description)
  const requested =
    cleanAgentName(name) ||
    agentNameFromPrompt(source, '') ||
    source

  if (!requested) {
    return NextResponse.json(
      { error: 'name is required' },
      { status: 400 },
    )
  }

  if (!isUsableAgentName(requested)) {
    return NextResponse.json(
      { error: 'Agent names must contain letters or numbers.' },
      { status: 400 },
    )
  }

  // Encrypt the API key only if one was provided
  const encryptedKey = userApiKey?.trim() ? encrypt(userApiKey.trim()) : undefined

  const db = await getDb()
  const settings = await db.collection('workspace_settings').findOne({ userId })
  if (settings?.permissions?.canEditWorkflows === false) {
    return NextResponse.json({ error: 'Workflow editing permission is disabled for this workspace.' }, { status: 403 })
  }
  await ensureAgentNameIndex(db)
  // Agents saved before uniqueness was enforced can still share a name; clean
  // those up first so the list we are about to compare against is truthful.
  await repairLegacyDuplicateNames(db, userId)

  const taken = await listTakenNames(db, userId)
  const clash = taken.find((existing) => isDuplicateAgentName(existing, requested))

  let agentName = requested
  if (clash) {
    if (!autoName) {
      return NextResponse.json(
        {
          error: `You already have an agent named "${clash}". Choose a different name.`,
          existingName: clash,
        },
        { status: 409 },
      )
    }
    agentName = nextAvailableAgentName(requested, taken)
  }

  const now = new Date()

  let result
  try {
    result = await db.collection('agents').insertOne({
      userId,
      name: agentName,
      nameNormalized: normalizeAgentName(agentName),
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
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { error: `You already have an agent named "${agentName}". Choose a different name.` },
        { status: 409 },
      )
    }
    throw error
  }

  const inserted = await db.collection('agents').findOne(
    { _id: result.insertedId },
    { projection: { userApiKey: 0 } }, // don't return the encrypted key
  )

  return NextResponse.json(inserted, { status: 201 })
}
