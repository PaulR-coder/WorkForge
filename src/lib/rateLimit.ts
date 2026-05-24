import { getRedis } from '@/lib/redis'

// ── In-memory fallback (single-instance only) ─────────────────────────────────
type Window = { count: number; resetAt: number }
const store = new Map<string, Window>()

setInterval(() => {
  const now = Date.now()
  for (const [key, w] of store) {
    if (now > w.resetAt) store.delete(key)
  }
}, 10 * 60 * 1000)

function inMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { ok: true, retryAfter: 0 }
}

// ── Redis-backed rate limiter with in-memory fallback ─────────────────────────
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfter: number }> {
  const redis = getRedis()

  if (redis) {
    try {
      const redisKey = `rl:${key}`
      const count = await redis.incr(redisKey)
      if (count === 1) {
        await redis.pexpire(redisKey, windowMs)
      }
      if (count > limit) {
        const ttl = await redis.pttl(redisKey)
        return { ok: false, retryAfter: Math.ceil(Math.max(ttl, 0) / 1000) }
      }
      return { ok: true, retryAfter: 0 }
    } catch {
      // Redis unavailable — fall through to in-memory
    }
  }

  return inMemoryRateLimit(key, limit, windowMs)
}

// ── IP extraction ─────────────────────────────────────────────────────────────
export function getIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()

  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const ips = xff.split(',').map(s => s.trim()).filter(Boolean)
    if (ips.length > 0) return ips[ips.length - 1]
  }

  return req.headers.get('x-real-ip') ?? 'unknown'
}
