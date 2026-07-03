import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const token = await getSessionTokenFromCookies()
    if (!token) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

    const payload = verifyJwt(token)
    const userId = payload.sub

    const body = await request.json()
    const { provider, key } = body

    const db = await getDb()

    await db.collection('api_keys').updateOne(
      { userId, provider },
      { $set: { encryptedKey: key, createdAt: new Date() } },
      { upsert: true },
    )

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }


}

