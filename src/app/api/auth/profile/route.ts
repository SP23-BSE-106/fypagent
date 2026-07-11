import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { ObjectId } from 'mongodb'


import { getDb } from '@/lib/mongo/mongo'
import { rateLimit } from '@/lib/rateLimit'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import { sendEmail } from '@/utils/mailer'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function base64ToBuffer(base64: string) {

  // Accept either raw base64 or data URL.
  const cleaned = base64.includes(',') ? base64.split(',')[1] : base64
  return Buffer.from(cleaned, 'base64')
}

function guessMimeFromDataUrl(base64OrDataUrl: string): string | null {
  if (!base64OrDataUrl.includes('data:')) return null
  const match = base64OrDataUrl.match(/^data:([^;]+);base64,/)
  return match?.[1] ?? null
}

function guessExtensionFromMime(mime: string) {
  const m = mime.toLowerCase()
  if (m === 'image/png') return 'png'
  if (m === 'image/jpeg') return 'jpg'
  if (m === 'image/jpg') return 'jpg'
  return null
}

function getAppOrigin(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto.split(',')[0].trim()}://${forwardedHost.split(',')[0].trim()}`
  }
  return new URL(request.url).origin
}

function isStrongPassword(password: string) {
  // Match the signup/reset policy in this codebase
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

export async function GET(request: NextRequest) {
  const token = await getSessionTokenFromCookies()
  if (!token) return NextResponse.json({ user: null }, { status: 200 })


  try {
    const payload = verifyJwt(token)
    const db = await getDb()

    const user = await db
      .collection('users')
      .findOne<{ _id: string } & Record<string, any>>({ _id: new ObjectId(payload.sub) as any })


    if (!user) return NextResponse.json({ user: null }, { status: 200 })

    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl ?? null,
        preferences: user.preferences ?? {},
        emailVerified: user.emailVerified,
      },
    })
  } catch {
    return NextResponse.json({ user: null }, { status: 200 })
  }
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
    action?: 'updateProfile' | 'changePassword'
    fullName?: string
    email?: string
    avatarBase64?: string // base64 or data URL
    preferences?: Record<string, any>


  }

  const action = body.action ?? 'updateProfile'

  if (action !== 'updateProfile') {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  }

  // updateProfile

  const fullName = (body.fullName ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()
  const passedPreferences = body.preferences && typeof body.preferences === 'object' ? body.preferences : {}

  // avatar validation
  const avatarBase64 = body.avatarBase64
  let avatarUrl: string | null | undefined = undefined

  if (typeof avatarBase64 === 'string' && avatarBase64.length > 0) {
    const buf = base64ToBuffer(avatarBase64)
    const sizeBytes = buf.byteLength
    const maxBytes = 2 * 1024 * 1024

    if (sizeBytes > maxBytes) {
      return NextResponse.json({ error: 'Avatar must be under 2MB' }, { status: 400 })
    }

    const mimeFromUrl = guessMimeFromDataUrl(avatarBase64)
    const ext = mimeFromUrl ? guessExtensionFromMime(mimeFromUrl) : null

    if (!mimeFromUrl || !ext) {
      return NextResponse.json({ error: 'Avatar must be JPG or PNG' }, { status: 400 })
    }

    // This app currently does not have a file storage service; store as data URL.
    avatarUrl = `data:${mimeFromUrl};base64,${avatarBase64.includes(',') ? avatarBase64.split(',')[1] : avatarBase64}`
  }

  const rl = rateLimit(`auth:update-profile:${userId}`, { windowMs: 60_000, max: 5 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfterMs: rl.retryAfterMs },
      { status: 429 },
    )
  }

  const currentUser = await users.findOne<{ _id: string; email: string; emailVerified: boolean; fullName?: string } & Record<string, any>>({ _id: new ObjectId(userId) } as any)
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const preferences = { ...(currentUser.preferences || {}), ...passedPreferences }

  // Always validate if email is provided.
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  const emailChanged = email && email !== currentUser.email

  if (emailChanged) {
    const existing = await users.findOne({ email })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }
    // BR-5: Email changes require re-verification.
    // create token + pending record
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000)

    // Store a pending verification record. Reuse same `email_verifications` collection schema.
    const pendingUsers = db.collection('email_verifications')

    await pendingUsers.insertOne({
      email,
      // keep passwordHash to allow creating real user if system ever uses it.
      // Here we just store fullName/avatar/preferences for convenience.
      passwordHash: currentUser.passwordHash,
      fullName: fullName || currentUser.fullName || undefined,
      avatarUrl: avatarUrl ?? currentUser.avatarUrl ?? undefined,
      preferences,
      createdAt: new Date(),

      verificationToken,
      verificationTokenExpiresAt,
    })

    // send verification email for the new email
    const origin = getAppOrigin(request)
    const verifyUrl = `${origin}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`

    await sendEmail({
      to: email,
      subject: 'Verify your email for AgentFlow',
      text: `Please verify your email address by visiting: ${verifyUrl}`,
      html: `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
          <h2>Verify your email for AgentFlow</h2>
          <p>Click the button below to verify your email address.</p>
          <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 14px;background:#111827;color:#fff;text-decoration:none;border-radius:8px;">Verify Email</a></p>
          <p style="color:#6b7280;font-size:12px;">This link expires in 1 hour.</p>
        </div>
      `,
    })

    // Apply non-email changes immediately; keep email as-is until verification.
    const update: Record<string, any> = {
      ...(fullName ? { fullName } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl } : {}),
      preferences,
    }

    await users.updateOne({ _id: new ObjectId(userId) } as any, { $set: update })

    return NextResponse.json({
      success: true,
      emailChangePendingVerification: true,
      message: 'Email changed. Please verify your new email address.',
    })
  }

  // Not changing email: update directly.
  const update: Record<string, any> = {
    ...(fullName ? { fullName } : {}),
    ...(email ? { email } : {}),
    preferences,
  }

  if (avatarUrl !== undefined) update.avatarUrl = avatarUrl

  await users.updateOne({ _id: new ObjectId(userId) } as any, { $set: update })

  return NextResponse.json({ success: true })
}

