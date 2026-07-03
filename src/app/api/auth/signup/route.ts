import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { getDb } from '@/lib/mongo/mongo'
import { rateLimit } from '@/lib/rateLimit'
import { signJwt, setSessionToken } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string
    password?: string
    fullName?: string
    name?: string
  }

  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''
  const fullName = (body.fullName || body.name || '').trim()

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const rl = rateLimit(`auth:signup:${email}`, { windowMs: 60_000, max: 5 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfterMs: rl.retryAfterMs },
      { status: 429 },
    )
  }

  const db = await getDb()
  const users = db.collection('users')

  const existing = await users.findOne({ email })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const result = await users.insertOne({
    email,
    passwordHash,
    fullName: fullName || undefined,
    createdAt: new Date(),
  })

  const newUserId = String(result.insertedId)

  const jwt = signJwt(
    { sub: newUserId, email, fullName: fullName || undefined },
    60 * 60 * 24 * 7,
  )
  await setSessionToken(jwt)

  return NextResponse.json({ success: true })
}

