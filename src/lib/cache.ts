/**
 * Redis cache wrapper with graceful fallback.
 *
 * - If REDIS_URL is not set, all operations are silent no-ops.
 * - If Redis throws at any point, the error is swallowed and the caller
 *   falls back to the database — caching is purely additive.
 *
 * TTL decisions:
 *   - jobs list   →  30 s  (high-churn, invalidated on every mutation)
 *   - tenant data → 300 s  (rarely changes; invalidated on tenant update)
 *   - default     →  60 s  (safe fallback)
 */

import Redis from 'ioredis'

// ---------------------------------------------------------------------------
// Client — initialized lazily so cold-start / test environments without
// REDIS_URL never attempt a connection.
// ---------------------------------------------------------------------------

let _client: Redis | null = null
let _available = false

function getClient(): Redis | null {
  if (_client) return _client
  const url = process.env.REDIS_URL
  if (!url) return null

  try {
    _client = new Redis(url, {
      // Fail fast rather than hanging on an unreachable server.
      connectTimeout: 3_000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
    })

    _client.on('ready', () => { _available = true })
    _client.on('error', () => { _available = false })
    _client.on('close', () => { _available = false })
    _client.on('end', () => { _available = false })

    return _client
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Public helper — lets callers (e.g. health route) surface Redis status.
// ---------------------------------------------------------------------------

export function isRedisAvailable(): boolean {
  // Trigger lazy init on first call so the flag is accurate.
  getClient()
  return _available
}

// ---------------------------------------------------------------------------
// Core cache operations
// ---------------------------------------------------------------------------

const DEFAULT_TTL = 60 // seconds

export const cache = {
  /** Return a cached value, or null on miss / error. */
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getClient()
      if (!client) return null
      const raw = await client.get(key)
      if (raw === null) return null
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  },

  /** Store a value with an optional TTL (seconds, default 60). */
  async set(key: string, value: unknown, ttlSeconds = DEFAULT_TTL): Promise<void> {
    try {
      const client = getClient()
      if (!client) return
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    } catch {
      // Silently ignore — the DB result will serve the request.
    }
  },

  /** Delete one or more exact keys. */
  async del(key: string | string[]): Promise<void> {
    try {
      const client = getClient()
      if (!client) return
      const keys = Array.isArray(key) ? key : [key]
      if (keys.length === 0) return
      await client.del(...keys)
    } catch {
      // Ignore.
    }
  },

  /**
   * Delete all keys matching a glob pattern (e.g. `'jobs:*'`).
   *
   * Uses SCAN so it never blocks the Redis event loop, even on large
   * keyspaces.  Runs in batches of up to 100.
   */
  async flush(pattern: string): Promise<void> {
    try {
      const client = getClient()
      if (!client) return

      let cursor = '0'
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
        cursor = nextCursor
        if (keys.length > 0) {
          await client.del(...keys)
        }
      } while (cursor !== '0')
    } catch {
      // Ignore.
    }
  },
}
