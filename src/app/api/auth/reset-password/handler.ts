import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { getDb } from '@/lib/mongo/mongo'
import { rateLimit } from '@/lib/rateLimit'

function isStrongPassword(password: string) {
  // Match the signup policy in this codebase
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    token?: string
    password?: string
  }

  const token = (body.token || '').trim()
  const password = body.password || ''

  if (!token || !password) {
    return NextResponse.json({ error: 'Missing token or password' }, { status: 400 })
  }

  if (!isStrongPassword(password)) {
    return NextResponse.json(
      {
        error:
          'Password must be at least 8 characters and include an uppercase letter, a number, and a special character',
      },
      { status: 400 },
    )
  }

  const rl = rateLimit(`auth:reset-password:${token}`, { windowMs: 60_000, max: 5 })
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests', retryAfterMs: rl.retryAfterMs }, { status: 429 })
  }

  const db = await getDb()
  const users = db.collection('users')

  const user = await users.findOne<{
    _id: string
    passwordResetTokenExpiresAt?: Date
  }>({ passwordResetToken: token })

  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  if (!user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await users.updateOne(
    // mongodb driver typings may expect ObjectId; runtime uses string IDs in this app
    ({ _id: user._id } as any),
    {
      $set: { passwordHash },
      $unset: { passwordResetToken: '', passwordResetTokenExpiresAt: '' },
    },
  )

  return NextResponse.json({ success: true, message: 'Password reset successfully' })
}

