import { NextRequest, NextResponse } from 'next/server'

import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'

export async function GET(_request: NextRequest) {
  const token = await getSessionTokenFromCookies()
  if (!token) return NextResponse.json({ user: null }, { status: 200 })

  try {
    const payload = verifyJwt(token)
    return NextResponse.json({
      user: {
        id: payload.sub,
        email: payload.email,
        fullName: payload.fullName,
      },
    })
  } catch {
    return NextResponse.json({ user: null }, { status: 200 })
  }
}

