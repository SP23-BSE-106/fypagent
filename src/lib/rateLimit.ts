export type RateLimitOptions = {
  /** Time window in milliseconds */
  windowMs: number
  /** Maximum number of requests allowed within the window */
  max: number
}

// In-memory rate limiter (per server instance). Good enough for development and
// for stopping accidental client storms.
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, opts: RateLimitOptions) {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { ok: true as const, remaining: opts.max - 1 }
  }

  if (bucket.count >= opts.max) {
    return {
      ok: false as const,
      remaining: 0,
      retryAfterMs: Math.max(0, bucket.resetAt - now),
    }
  }

  bucket.count += 1
  return { ok: true as const, remaining: opts.max - bucket.count }
}

