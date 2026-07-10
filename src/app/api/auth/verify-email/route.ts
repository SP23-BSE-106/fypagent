import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo/mongo'


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = (searchParams.get('token') || '').trim()

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const db = await getDb()

  // Read pending signup record (do not create `users` until verified)
  const pendingUsers = db.collection('email_verifications')
  const user = await pendingUsers.findOne<{
    _id: string
    email: string
    passwordHash: string
    fullName?: string
    verificationTokenExpiresAt?: Date
    verificationToken?: string
  }>({ verificationToken: token })

  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  if (!user.verificationTokenExpiresAt || user.verificationTokenExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 400 })
  }

  // Create the real user now
  const users = db.collection('users')
  await users.insertOne({
    email: user.email,
    passwordHash: user.passwordHash,
    fullName: user.fullName || undefined,
    createdAt: new Date(),
    emailVerified: true,
    // extra fields from pending record are not needed in `users`
  })

  // Cleanup pending record
  // `pendingUsers` is untyped; use token/email to avoid ObjectId typing issues.
  await pendingUsers.deleteOne({ verificationToken: token })


  return NextResponse.redirect(new URL('/login?verified=1', request.url))
}



