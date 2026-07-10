import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo/mongo'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = (searchParams.get('token') || '').trim()

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const db = await getDb()
  const users = db.collection('users')

  const user = await users.findOne<{
    _id: string
    email: string
    emailVerified?: boolean
    verificationToken?: string
    verificationTokenExpiresAt?: Date
  }>({ verificationToken: token })

  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  if (!user.verificationTokenExpiresAt || user.verificationTokenExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 400 })
  }

  await users.updateOne(
    ({ _id: user._id } as any),
    {
      $set: { emailVerified: true },
      $unset: { verificationToken: '', verificationTokenExpiresAt: '' },
    },
  )

  return NextResponse.redirect(new URL('/login?verified=1', request.url))
}

