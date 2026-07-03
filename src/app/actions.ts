'use server'
import { createClient } from '@supabase/supabase-js'

import { rateLimit } from '@/lib/rateLimit'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

export async function saveApiKey(provider: string, key: string) {
  // Minimal fixed-window limiter to prevent API key storms.
  const rlKey = `saveApiKey:${provider}`
  const rl = rateLimit(rlKey, { windowMs: 60_000, max: 5 })
  if (!rl.ok) {
    throw new Error(`Too many requests. Retry after ${rl.retryAfterMs}ms`)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const { error } = await supabase.from('api_keys').insert({
    user_id: user.id,
    provider,
    encrypted_key: key,
  })

  if (error) throw new Error(error.message)
  return { success: true }
}

