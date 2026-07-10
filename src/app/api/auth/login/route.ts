import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { getDb } from '@/lib/mongo/mongo'
import { rateLimit } from '@/lib/rateLimit'
import { signJwt, setSessionToken } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string
    password?: string
  }

  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
  }

  const rl = rateLimit(`auth:login:${email}`, { windowMs: 60_000, max: 5 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfterMs: rl.retryAfterMs },
      { status: 429 },
    )
  }

  const db = await getDb()
  const users = db.collection('users')

  const user = await users.findOne<{
    _id: string
    email: string
    passwordHash: string
    fullName?: string
    emailVerified?: boolean
  }>({ email })



  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  if (!user.emailVerified) {
    return NextResponse.json({ error: 'Email verification required' }, { status: 403 })
  }

  const jwt = signJwt(
    { sub: user._id, email: user.email, fullName: user.fullName },
    60 * 60 * 24 * 7,
  )
  await setSessionToken(jwt)

  return NextResponse.json({ success: true })
}


