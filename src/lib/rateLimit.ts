// NOTE: This rate limiter is in-process only. Counts are not shared across Railway
// instances if you scale horizontally. For production-grade rate limiting, configure
// a Cloudflare WAF rate-limit rule at the edge (Cloudflare Dashboard → Security →
// WAF → Rate limiting rules). That sits in front of all instances and is far more
// effective than anything we can do in-app. The in-process limiter here still
// provides meaningful protection for single-instance deployments and adds friction
// even in multi-instance scenarios.

type Window = { count: number; resetAt: number }

const store = new Map<string, Window>()

// Prune expired entries every 10 minutes to prevent unbounded growth
setInterval(() => {
  const now = Date.now()
  for (const [key, w] of store) {
    if (now > w.resetAt) store.delete(key)
  }
}, 10 * 60 * 1000)

export function rateLimit(
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

export function getIp(req: Request): string {
  // cf-connecting-ip is set by Cloudflare and cannot be spoofed by clients
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()

  // Fall back to the LAST (rightmost) entry in x-forwarded-for, which is the
  // IP added by our own proxy — earlier entries can be forged by the client
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const ips = xff.split(',').map(s => s.trim()).filter(Boolean)
    if (ips.length > 0) return ips[ips.length - 1]
  }

  return req.headers.get('x-real-ip') ?? 'unknown'
}
