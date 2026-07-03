import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'

export async function GET() {
  const token = await getSessionTokenFromCookies()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = verifyJwt(token)
  const userId = payload.sub

  const db = await getDb()
  const agents = await db
    .collection('agents')
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray()

  return NextResponse.json(agents)
}

export async function POST(request: NextRequest) {
  const token = await getSessionTokenFromCookies()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = verifyJwt(token)
  const userId = payload.sub

  const body = await request.json()
  const { name, description, prompt, model } = body

  const db = await getDb()
  const result = await db.collection('agents').insertOne({
    userId,
    name,
    description,
    prompt,
    model,
    createdAt: new Date(),
  })

  const inserted = await db.collection('agents').findOne({ _id: result.insertedId })
  return NextResponse.json(inserted)
}

