import crypto from 'crypto'

import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_ISSUER = process.env.JWT_ISSUER || 'agentflow'

function base64url(input: Buffer) {
  return input
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function fromBase64url(input: string) {
  input = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  return Buffer.from(input + pad, 'base64')
}

export type JwtPayload = {
  sub: string
  email: string
  fullName?: string
  iat: number
  exp: number
  iss: string
}

export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss'>, maxAgeSeconds: number) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not set')

  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + maxAgeSeconds

  const header = { alg: 'HS256', typ: 'JWT' }
  const body: JwtPayload = {
    sub: payload.sub,
    email: payload.email,
    fullName: payload.fullName,
    iat,
    exp,
    iss: JWT_ISSUER,
  }

  const encodedHeader = base64url(Buffer.from(JSON.stringify(header)))
  const encodedBody = base64url(Buffer.from(JSON.stringify(body)))
  const data = `${encodedHeader}.${encodedBody}`

  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest()
  const encodedSignature = base64url(signature)

  return `${data}.${encodedSignature}`
}

export function verifyJwt(token: string): JwtPayload {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not set')

  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token')

  const [encodedHeader, encodedBody, encodedSignature] = parts
  const data = `${encodedHeader}.${encodedBody}`

  const expected = base64url(
    crypto.createHmac('sha256', JWT_SECRET).update(data).digest(),
  )

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(encodedSignature))) {
    throw new Error('Invalid token signature')
  }

  const body = JSON.parse(fromBase64url(encodedBody).toString('utf8')) as JwtPayload

  if (body.iss !== JWT_ISSUER) throw new Error('Invalid token issuer')
  if (Math.floor(Date.now() / 1000) >= body.exp) throw new Error('Token expired')

  return body
}

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'agentflow_session'

export async function getSessionTokenFromCookies() {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value
}

export async function setSessionToken(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function clearSessionToken() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}


