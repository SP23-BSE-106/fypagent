import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/mongo/mongo'

const COLLECTIONS = [
  'workflow_runs',
  'agent_versions',
  'workflow_templates',
  'rag_documents',
  'rag_chunks',
  'audit_events',
  'user_settings',
] as const

/**
 * Dev-only endpoint to force MongoDB collections to appear in the UI/Compass.
 *
 * This does NOT change your existing runtime behavior.
 * It only inserts ONE dummy document per missing collection.
 */
async function initCollections() {
  const db = await getDb()

  const results: Record<string, { inserted: boolean }> = {}

  for (const name of COLLECTIONS) {
    const col = db.collection(name)

    const existing = await col.findOne({})
    if (existing) {
      results[name] = { inserted: false }
      continue
    }

    await col.insertOne({
      _id: `${name}:dev-init`,
      createdAt: new Date(),
    } as any)

    results[name] = { inserted: true }
  }

  return results
}

export async function GET(request: NextRequest) { 
  const secret = request.headers.get('x-dev-secret')
  const expected = process.env.DEV_INIT_COLLECTIONS_SECRET || 'dev'

  if (!secret || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await initCollections()
  return NextResponse.json({ success: true, results })
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-dev-secret')
  const expected = process.env.DEV_INIT_COLLECTIONS_SECRET || 'dev'

  // Require a secret so it can't be called by accident.
  // Default is 'dev' for convenience in local development.
  if (!secret || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }


  const db = await getDb()

  const results: Record<string, { inserted: boolean }> = {}

  for (const name of COLLECTIONS) {
    const col = db.collection(name)

    // If it exists (has at least one document), do nothing.
    // Note: Mongo creates collections on first insert; checking is cheap.
    const existing = await col.findOne({})
    if (existing) {
      results[name] = { inserted: false }
      continue
    }

    // Insert minimal placeholder doc.
    await col.insertOne({
      // Force a write so the collection becomes visible in MongoDB tools.
      // Use an ObjectId-like string to avoid type issues.
      _id: `${name}:dev-init`,
      createdAt: new Date(),
    } as any)


    results[name] = { inserted: true }
  }

  return NextResponse.json({ success: true, results })
}

