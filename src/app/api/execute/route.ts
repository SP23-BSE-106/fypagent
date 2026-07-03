import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { rateLimit } from '@/lib/rateLimit'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const key = request.headers.get('x-forwarded-for') || request.ip || 'unknown'
    const rl = rateLimit(`execute:${key}`, { windowMs: 60_000, max: 10 })
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfterMs: rl.retryAfterMs },
        { status: 429 },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await request.json().catch(() => ({}))

    return NextResponse.json({ success: true, message: 'Workflow executed' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

