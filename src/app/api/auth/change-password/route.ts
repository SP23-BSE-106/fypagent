import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'

import { getDb } from '@/lib/mongo/mongo'
import { rateLimit } from '@/lib/rateLimit'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'

function isStrongPassword(password: string) {
  // Match the signup/reset policy in this codebase
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

export async function POST(request: NextRequest) {
  const token = await getSessionTokenFromCookies()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload: ReturnType<typeof verifyJwt>
  try {
    payload = verifyJwt(token)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await getDb()
  const users = db.collection('users')
  const userId = payload.sub

  const body = (await request.json().catch(() => ({}))) as {
    currentPassword?: string
    newPassword?: string
  }

  const currentPassword = body.currentPassword || ''
  const newPassword = body.newPassword || ''

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Missing current or new password' }, { status: 400 })
  }

  if (!isStrongPassword(newPassword)) {
    return NextResponse.json(
      {
        error:
          'Password must be at least 8 characters and include an uppercase letter, a number, and a special character',
      },
      { status: 400 },
    )
  }

  const rl = rateLimit(`auth:change-password:${userId}`, { windowMs: 60_000, max: 5 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfterMs: rl.retryAfterMs },
      { status: 429 },
    )
  }

  const user = await users.findOne<{ passwordHash: string } & Record<string, any>>(
    { _id: new ObjectId(userId) } as any,
  )
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

  const newHash = await bcrypt.hash(newPassword, 10)
  await users.updateOne({ _id: new ObjectId(userId) } as any, { $set: { passwordHash: newHash } })

  return NextResponse.json({ success: true })
}

