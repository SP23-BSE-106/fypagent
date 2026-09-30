import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import { EMBEDDING_DIMENSION, EMBEDDING_MODEL } from '@/lib/rag/embeddings'
import { getIndexStatus, VECTOR_INDEX_NAME, type VectorIndexStatus } from '@/lib/rag/vectorStore'

/**
 * GET /api/settings/system
 *
 * Read-only runtime report for the System card on the settings page: which
 * environment this deployment is serving, whether the database answers, and
 * whether the Atlas vector index behind the knowledge base is queryable.
 *
 * Deliberately side-effect free — `getIndexStatus` only reads the index
 * definition, unlike `ensureVectorIndex`, which will create one.
 */

function getAppOrigin(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto.split(',')[0].trim()}://${forwardedHost.split(',')[0].trim()}`
  }
  return new URL(request.url).origin
}

export async function GET(request: NextRequest) {
  try {
    const token = await getSessionTokenFromCookies()
    if (!token) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    verifyJwt(token)

    // Database reachability.
    let database: { status: 'connected'; } | { status: 'error'; message: string }
    try {
      const db = await getDb()
      await db.command({ ping: 1 })
      database = { status: 'connected' }
    } catch (e) {
      database = { status: 'error', message: e instanceof Error ? e.message : 'Unreachable' }
    }

    // Vector index health (only meaningful if the database answered).
    let vectorIndex: { name: string; state: VectorIndexStatus; queryable: boolean } | null = null
    if (database.status === 'connected') {
      try {
        const state = await getIndexStatus({ refresh: true })
        vectorIndex = { name: VECTOR_INDEX_NAME, state, queryable: state === 'READY' }
      } catch {
        vectorIndex = null
      }
    }

    return NextResponse.json({
      system: {
        environment:
          process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        region: process.env.VERCEL_REGION || null,
        runtime: process.version,
        appUrl: getAppOrigin(request),
        serverTime: new Date().toISOString(),
        database,
        vectorIndex,
        embedding: { model: EMBEDDING_MODEL, dimension: EMBEDDING_DIMENSION },
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
