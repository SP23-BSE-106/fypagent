import { NextRequest, NextResponse } from 'next/server'

import { clearSessionToken } from '@/lib/auth/jwt'

export async function POST(_request: NextRequest) {
  await clearSessionToken()
  return NextResponse.json({ success: true })
}

