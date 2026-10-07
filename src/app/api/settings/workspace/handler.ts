import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo/mongo'
import { rateLimit } from '@/lib/rateLimit'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'

async function requireUser(): Promise<{ userId: string } | NextResponse> {
  const token = await getSessionTokenFromCookies()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return { userId: verifyJwt(token).sub }
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
}

const DEFAULTS = {
  role: 'admin',
  permissions: {
    canExecute: true,
    canDeploy: true,
    canManageKeys: true,
    canEditWorkflows: true,
  },
  appearance: {
    density: 'comfortable',
    accent: 'emerald',
  },
}

export async function GET() {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth
  const db = await getDb()
  const doc = await db.collection('workspace_settings').findOne({ userId: auth.userId })
  return NextResponse.json({ settings: doc ? { ...DEFAULTS, ...doc } : DEFAULTS })
}

export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth

  const rl = rateLimit(`settings:workspace:${auth.userId}`, { windowMs: 60_000, max: 10 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests', retryAfterMs: rl.retryAfterMs }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const role = ['admin', 'editor', 'viewer'].includes(body.role) ? body.role : DEFAULTS.role
  const permissions = { ...DEFAULTS.permissions, ...(body.permissions || {}) }
  const appearance = { ...DEFAULTS.appearance, ...(body.appearance || {}) }

  const db = await getDb()
  await db.collection('workspace_settings').updateOne(
    { userId: auth.userId },
    { $set: { userId: auth.userId, role, permissions, appearance, updatedAt: new Date() } },
    { upsert: true },
  )

  return NextResponse.json({ success: true, settings: { role, permissions, appearance } })
}

export async function PATCH(request: NextRequest) {
  return POST(request)
}
