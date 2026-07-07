import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { getDb } from '@/lib/mongo/mongo'
import { rateLimit } from '@/lib/rateLimit'
import { signJwt, setSessionToken } from '@/lib/auth/jwt'

function isStrongPassword(password: string) {
  return password.length >= 12 && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
}

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
  if (!isStrongPassword(password)) {
    return NextResponse.json({ error: 'Password must be at least 12 characters and include an uppercase letter, a number, and a special character' }, { status: 400 })
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

