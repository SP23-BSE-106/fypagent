import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { key?: string; max?: number; windowMs?: number }

  const key = body.key
  const max = typeof body.max === 'number' ? body.max : 5
  const windowMs = typeof body.windowMs === 'number' ? body.windowMs : 60_000

  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 })
  }

  const res = rateLimit(key, { max, windowMs })
  if (!res.ok) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfterMs: res.retryAfterMs,
      },
      { status: 429 },
    )
  }

  return NextResponse.json({ ok: true, remaining: res.remaining })
}

