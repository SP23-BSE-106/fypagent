'use server'

'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

import { getDb } from '@/lib/mongo/mongo'
import { rateLimit } from '@/lib/rateLimit'
import { clearSessionToken, getSessionTokenFromCookies, setSessionToken, signJwt, verifyJwt } from '@/lib/auth/jwt'

function isStrongPassword(password: string) {
  return password.length >= 12 && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
}

export async function login(email: string, password: string) {
  const rl = rateLimit(`auth:login:${email}`, { windowMs: 60_000, max: 5 })
  if (!rl.ok) return { error: `Too many requests. Retry after ${rl.retryAfterMs}ms` }

  const db = await getDb()
  const users = db.collection('users')

  const user = await users.findOne<{ _id: string; email: string; passwordHash: string; fullName?: string }>({
    email: email.trim().toLowerCase(),
  })

  if (!user) return { error: 'Invalid credentials' }

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return { error: 'Invalid credentials' }

  const jwt = signJwt(
    { sub: String(user._id), email: user.email, fullName: user.fullName },
    60 * 60 * 24 * 7,
  )
  await setSessionToken(jwt)

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signup(email: string, password: string, fullName: string) {
  const rl = rateLimit(`auth:signup:${email}`, { windowMs: 60_000, max: 5 })
  if (!rl.ok) return { error: `Too many requests. Retry after ${rl.retryAfterMs}ms` }
  if (!isStrongPassword(password)) return { error: 'Password must be at least 12 characters and include an uppercase letter, a number, and a special character' }

  const db = await getDb()
  const users = db.collection('users')

  const normalizedEmail = email.trim().toLowerCase()
  const existing = await users.findOne({ email: normalizedEmail })
  if (existing) return { error: 'Email already in use' }

  const passwordHash = await bcrypt.hash(password, 10)

  const result = await users.insertOne({
    email: normalizedEmail,
    passwordHash,
    fullName: fullName.trim() || undefined,
    createdAt: new Date(),
  })

  const insertedId = String(result.insertedId)

  const jwt = signJwt(
    { sub: insertedId, email: normalizedEmail, fullName: fullName.trim() || undefined },
    60 * 60 * 24 * 7,
  )
  await setSessionToken(jwt)

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signout() {
  await clearSessionToken()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function getSession() {
  const token = await getSessionTokenFromCookies()
  if (!token) return null

  try {
    const payload = verifyJwt(token)
    return {
      user: {
        id: payload.sub,
        email: payload.email,
        fullName: payload.fullName,
      },
    }
  } catch {
    return null
  }
}

export async function getUser() {
  const session = await getSession()
  return session?.user ?? null
}


