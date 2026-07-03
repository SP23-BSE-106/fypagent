import { NextRequest, NextResponse } from 'next/server'

import { rateLimit } from '@/lib/rateLimit'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const key = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    const rl = rateLimit(`execute:${key}`, { windowMs: 60_000, max: 10 })

    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfterMs: rl.retryAfterMs },
        { status: 429 },
      )
    }

    const token = await getSessionTokenFromCookies()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    verifyJwt(token)

    await request.json().catch(() => ({}))

    return NextResponse.json({ success: true, message: 'Workflow executed' })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }

}


