import { NextRequest, NextResponse } from 'next/server'

// ─── Edge-compatible JWT verification ────────────────────────────────────────
// Cannot import from @/lib/auth/jwt because that uses Node.js crypto which is
// unavailable on the Edge Runtime. We replicate the minimal check here using
// the Web Crypto API that is always available on the edge.

const JWT_SECRET = process.env.JWT_SECRET ?? ''
const JWT_ISSUER = process.env.JWT_ISSUER || 'agentflow'
const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'agentflow_session'

function fromBase64url(input: string): Uint8Array {
  input = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  const binary = atob(input + pad)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function verifyJwtEdge(token: string): Promise<boolean> {
  try {
    if (!JWT_SECRET) return false

    const parts = token.split('.')
    if (parts.length !== 3) return false

    const [encodedHeader, encodedBody, encodedSignature] = parts

    // Import the secret key
    const keyData = new TextEncoder().encode(JWT_SECRET)
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    // Verify HMAC signature
    const signature = fromBase64url(encodedSignature)
    const data = new TextEncoder().encode(`${encodedHeader}.${encodedBody}`)
    // Extract a plain ArrayBuffer from the Uint8Array (avoids SharedArrayBuffer type conflict)
    const signatureBuffer = signature.buffer.slice(
      signature.byteOffset,
      signature.byteOffset + signature.byteLength,
    ) as ArrayBuffer

    const valid = await crypto.subtle.verify('HMAC', key, signatureBuffer, data)
    if (!valid) return false

    // Check payload claims
    const body = JSON.parse(atob(encodedBody.replace(/-/g, '+').replace(/_/g, '/')))

    if (body.iss !== JWT_ISSUER) return false
    if (Math.floor(Date.now() / 1000) >= body.exp) return false

    return true
  } catch {
    return false
  }
}

// ─── Protected route prefixes ─────────────────────────────────────────────────
// Any path starting with these will require a valid session.
const PROTECTED = ['/dashboard', '/workflow-builder', '/testing-sandbox']

// Public paths that are always allowed (even if they start with a protected prefix)
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/about',
  '/contact',
  '/docs',
  '/privacy',
  '/terms',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow Next.js internals, static files, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$/)
  ) {
    return NextResponse.next()
  }

  // Always allow explicitly public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Check if this is a protected route
  const isProtected = PROTECTED.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  )

  if (!isProtected) {
    return NextResponse.next()
  }

  // Read the session cookie
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (!token) {
    // No session at all → redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verify the token on the edge
  const valid = await verifyJwtEdge(token)

  if (!valid) {
    // Token expired or tampered → clear cookie and redirect
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete(SESSION_COOKIE)
    return response
  }

  // All good — allow the request through
  return NextResponse.next()
}

// Tell Next.js which routes the middleware should run on.
// Using a broad matcher and then doing the filtering above ourselves
// gives us full, readable control over the logic.
export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
