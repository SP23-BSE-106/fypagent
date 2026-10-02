import { NextRequest, NextResponse } from 'next/server'
import type { Db } from 'mongodb'

import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'

/**
 * Execution history — the data behind Monitoring & Control.
 *
 * Every run the sandbox (or any caller) reports is written here so the
 * analytics page can show measured numbers instead of stating that runs are
 * not recorded. Reads are limited to the caller's own workspace, and both
 * input and output are truncated: this is a monitoring log, not a transcript
 * store, so a runaway prompt cannot bloat the collection.
 */

/** 50 is enough for the dashboard table; the summary covers everything. */
const RECENT_LIMIT = 50
const MAX_INPUT_CHARS = 2_000
const MAX_OUTPUT_CHARS = 4_000

let runsIndex: Promise<unknown> | null = null

/** Newest-first reads are the only access pattern; index them once per warm instance. */
function ensureRunsIndex(db: Db): Promise<unknown> {
  if (!runsIndex) {
    runsIndex = db
      .collection('workflow_runs')
      .createIndex({ userId: 1, createdAt: -1 })
      .catch(() => null)
  }
  return runsIndex
}

/**
 * Returns the user id, or a ready-made 401. Handlers here are two lines each,
 * so the session check is factored rather than pasted into every export.
 */
async function requireUser(): Promise<{ userId: string } | NextResponse> {
  const token = await getSessionTokenFromCookies()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    return { userId: verifyJwt(token).sub }
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

type RunSummary = {
  total: number
  sessions: number
  succeeded: number
  failed: number
  avgDurationMs: number | null
  lastRunAt: string | null
}

function emptySummary(): RunSummary {
  return {
    total: 0,
    sessions: 0,
    succeeded: 0,
    failed: 0,
    avgDurationMs: null,
    lastRunAt: null,
  }
}

/** GET /api/agents/runs — recent executions plus measured totals for the workspace. */
export async function GET() {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth

  const db = await getDb()
  await ensureRunsIndex(db)

  const [summaryRows, rows] = await Promise.all([
    db
      .collection('workflow_runs')
      .aggregate([
        { $match: { userId: auth.userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            sessions: { $sum: { $cond: [{ $eq: ['$kind', 'session'] }, 1, 0] } },
            succeeded: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$kind', 'exec'] }, { $eq: ['$status', 'success'] }] },
                  1,
                  0,
                ],
              },
            },
            failed: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$kind', 'exec'] }, { $eq: ['$status', 'failed'] }] },
                  1,
                  0,
                ],
              },
            },
            // $avg skips nulls, so saved sessions do not drag the mean to 0.
            avgDurationMs: {
              $avg: { $cond: [{ $eq: ['$kind', 'exec'] }, '$durationMs', null] },
            },
            lastRunAt: { $max: '$createdAt' },
          },
        },
      ])
      .toArray(),
    db
      .collection('workflow_runs')
      .find({ userId: auth.userId })
      .sort({ createdAt: -1 })
      .limit(RECENT_LIMIT)
      .toArray(),
  ])

  const grouped = summaryRows[0]
  const summary: RunSummary = grouped
    ? {
        total: Number(grouped.total) || 0,
        sessions: Number(grouped.sessions) || 0,
        succeeded: Number(grouped.succeeded) || 0,
        failed: Number(grouped.failed) || 0,
        avgDurationMs:
          typeof grouped.avgDurationMs === 'number' ? Math.round(grouped.avgDurationMs) : null,
        lastRunAt: grouped.lastRunAt ? new Date(grouped.lastRunAt).toISOString() : null,
      }
    : emptySummary()

  return NextResponse.json({
    runs: rows.map((row) => ({
      id: String(row._id),
      kind: row.kind === 'session' ? 'session' : 'exec',
      agentId: typeof row.agentId === 'string' ? row.agentId : null,
      agentName: typeof row.agentName === 'string' ? row.agentName : null,
      status: row.status === 'failed' ? 'failed' : 'success',
      input: clip(row.input, 500),
      output: clip(row.output, MAX_OUTPUT_CHARS),
      sourceCount: Number(row.sourceCount) || 0,
      durationMs: Number(row.durationMs) || 0,
      provider: typeof row.provider === 'string' ? row.provider : null,
      model: typeof row.model === 'string' ? row.model : null,
      error: typeof row.error === 'string' ? row.error : null,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    })),
    summary,
  })
}

/**
 * POST /api/agents/runs — record one execution.
 *
 * The response is deliberately 201 with a small acknowledgement: a failed
 * record must never surface to the user as a failed test run, because the run
 * itself already happened. Recording problems are logged, not thrown.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const kind = body.kind === 'session' ? 'session' : 'exec'
  const status = body.status === 'failed' ? 'failed' : 'success'
  const input = clip(body.input, MAX_INPUT_CHARS)
  const output = clip(body.output, MAX_OUTPUT_CHARS)

  if (!input && !output) {
    return NextResponse.json(
      { error: 'A run must record an input or an output.' },
      { status: 400 },
    )
  }

  const durationMs =
    kind === 'exec' && Number.isFinite(Number(body.durationMs))
      ? Math.max(0, Math.round(Number(body.durationMs)))
      : 0

  const record = {
    userId: auth.userId,
    kind,
    agentId: typeof body.agentId === 'string' ? body.agentId.slice(0, 64) : null,
    agentName: typeof body.agentName === 'string' ? clip(body.agentName, 120) : null,
    status,
    input,
    output,
    sourceCount: Number.isFinite(Number(body.sourceCount))
      ? Math.max(0, Math.round(Number(body.sourceCount)))
      : 0,
    durationMs,
    provider: typeof body.provider === 'string' ? clip(body.provider, 60) : null,
    model: typeof body.model === 'string' ? clip(body.model, 120) : null,
    error: status === 'failed' && body.error ? clip(body.error, 400) : null,
    createdAt: new Date(),
  }

  try {
    const db = await getDb()
    await ensureRunsIndex(db)
    const result = await db.collection('workflow_runs').insertOne(record)
    return NextResponse.json(
      { ok: true, id: String(result.insertedId) },
      { status: 201 },
    )
  } catch (error) {
    // Monitoring must not break the thing being monitored.
    console.warn('[agents/runs] could not record run:', error)
    return NextResponse.json({ ok: false }, { status: 201 })
  }
}
