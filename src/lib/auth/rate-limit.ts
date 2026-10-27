/*
 * Sliding-window limiter for login attempts. In-memory, so it is per serverless
 * instance: enough to make online guessing slow for a single-admin site, combined with
 * scrypt's cost. Swap for a shared store if the site ever gets more admins.
 */

type Bucket = number[]
const buckets = new Map<string, Bucket>()

export function rateLimit(key: string, opts: { limit: number; windowMs: number; now?: number }) {
  const now = opts.now ?? Date.now()
  const from = now - opts.windowMs
  const hits = (buckets.get(key) ?? []).filter((t) => t > from)
  if (hits.length >= opts.limit) {
    buckets.set(key, hits)
    return { ok: false as const, retryAfterMs: hits[0] + opts.windowMs - now }
  }
  hits.push(now)
  buckets.set(key, hits)
  if (buckets.size > 5000) buckets.delete(buckets.keys().next().value as string)
  return { ok: true as const, remaining: opts.limit - hits.length }
}

export function resetRateLimit(key: string) {
  buckets.delete(key)
}
