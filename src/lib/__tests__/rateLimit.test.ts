/**
 * Unit tests for src/lib/rateLimit.ts
 *
 * rateLimit(key, limit, windowMs) → { ok: boolean; retryAfter: number }
 *
 * Strategy:
 *   - Jest's fake timers control Date.now() so we can test window expiry
 *     without real sleeps.
 *   - We re-import the module fresh for each test group via jest.isolateModules
 *     so the in-module Map<> store starts empty.  (The module-level setInterval
 *     is also reset on each fresh import.)
 */

// We DON'T use jest.useFakeTimers() globally because it can interfere with
// the module-level setInterval.  Instead we spy on Date.now() in the tests
// that need time control.

describe('rateLimit', () => {
  // Shared reference rebuilt before each test so the in-memory store is fresh.
  let rateLimit: (key: string, limit: number, windowMs: number) => { ok: boolean; retryAfter: number }

  beforeEach(() => {
    jest.resetModules()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    rateLimit = require('@/lib/rateLimit').rateLimit
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // Basic allow / block behaviour
  // -------------------------------------------------------------------------

  describe('requests under the limit', () => {
    it('allows the first request', () => {
      const result = rateLimit('ip:1.2.3.4', 5, 60_000)
      expect(result.ok).toBe(true)
      expect(result.retryAfter).toBe(0)
    })

    it('allows requests up to the limit', () => {
      for (let i = 1; i <= 5; i++) {
        const result = rateLimit('ip:test-under', 5, 60_000)
        expect(result.ok).toBe(true)
      }
    })
  })

  describe('requests over the limit', () => {
    it('blocks the request immediately after the limit is reached', () => {
      const key = 'ip:over-limit'
      const limit = 3
      for (let i = 0; i < limit; i++) rateLimit(key, limit, 60_000)
      const blocked = rateLimit(key, limit, 60_000)
      expect(blocked.ok).toBe(false)
    })

    it('continues to block subsequent requests in the same window', () => {
      const key = 'ip:keep-blocking'
      const limit = 2
      rateLimit(key, limit, 60_000)
      rateLimit(key, limit, 60_000)
      // Both next calls should be blocked
      expect(rateLimit(key, limit, 60_000).ok).toBe(false)
      expect(rateLimit(key, limit, 60_000).ok).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // retryAfter calculation
  // -------------------------------------------------------------------------

  describe('retryAfter', () => {
    it('is 0 when the request is allowed', () => {
      expect(rateLimit('ip:retry-0', 10, 60_000).retryAfter).toBe(0)
    })

    it('is a positive integer in seconds when blocked', () => {
      const key = 'ip:retry-seconds'
      const windowMs = 30_000 // 30-second window
      rateLimit(key, 1, windowMs)       // consume the only slot
      const { retryAfter } = rateLimit(key, 1, windowMs)
      // retryAfter must be between 1 and 30 (ceiling of remaining ms / 1000)
      expect(retryAfter).toBeGreaterThanOrEqual(1)
      expect(retryAfter).toBeLessThanOrEqual(30)
    })

    it('returns the ceiling of remaining window time', () => {
      // Fix Date.now so we can calculate expected retryAfter precisely.
      const now = 1_700_000_000_000
      jest.spyOn(Date, 'now').mockReturnValue(now)

      const key = 'ip:retry-ceil'
      const windowMs = 5_000 // 5-second window

      rateLimit(key, 1, windowMs) // consumes the slot; resetAt = now + 5000

      // Advance time by 1500 ms — remaining = 3500 ms → ceil = 4 seconds
      jest.spyOn(Date, 'now').mockReturnValue(now + 1_500)
      const { retryAfter } = rateLimit(key, 1, windowMs)

      expect(retryAfter).toBe(4) // ceil(3500 / 1000) = 4
    })
  })

  // -------------------------------------------------------------------------
  // Independent counters per key
  // -------------------------------------------------------------------------

  describe('independent counters', () => {
    it('different keys do not share counters', () => {
      rateLimit('keyA', 1, 60_000) // exhaust keyA
      const resultB = rateLimit('keyB', 1, 60_000) // keyB still fresh
      expect(resultB.ok).toBe(true)
    })

    it('exhausting one IP does not affect another IP', () => {
      const limit = 3
      const win = 60_000
      for (let i = 0; i < limit; i++) rateLimit('ip:192.168.1.1', limit, win)
      expect(rateLimit('ip:192.168.1.1', limit, win).ok).toBe(false)
      expect(rateLimit('ip:10.0.0.1',    limit, win).ok).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Window reset / expiry
  // -------------------------------------------------------------------------

  describe('window expiry', () => {
    it('allows requests again after the window expires', () => {
      const key = 'ip:window-reset'
      const limit = 1
      const windowMs = 2_000 // 2-second window

      const start = 1_700_000_000_000
      jest.spyOn(Date, 'now').mockReturnValue(start)

      rateLimit(key, limit, windowMs) // consume the slot
      expect(rateLimit(key, limit, windowMs).ok).toBe(false) // blocked

      // Advance past the window boundary
      jest.spyOn(Date, 'now').mockReturnValue(start + windowMs + 1)

      const afterReset = rateLimit(key, limit, windowMs)
      expect(afterReset.ok).toBe(true)
      expect(afterReset.retryAfter).toBe(0)
    })

    it('resets the count to 1 after expiry (not 0)', () => {
      const key = 'ip:reset-count'
      const limit = 2
      const windowMs = 1_000

      const start = Date.now()
      jest.spyOn(Date, 'now').mockReturnValue(start)

      // Exhaust the window
      rateLimit(key, limit, windowMs)
      rateLimit(key, limit, windowMs)
      expect(rateLimit(key, limit, windowMs).ok).toBe(false)

      // Jump past expiry — first call in new window should succeed and start count at 1
      jest.spyOn(Date, 'now').mockReturnValue(start + windowMs + 1)
      expect(rateLimit(key, limit, windowMs).ok).toBe(true)
      // Second call in new window should also succeed (limit is 2)
      expect(rateLimit(key, limit, windowMs).ok).toBe(true)
      // Third call should be blocked
      expect(rateLimit(key, limit, windowMs).ok).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('limit of 1 blocks on the second call', () => {
      const key = 'ip:limit-one'
      expect(rateLimit(key, 1, 60_000).ok).toBe(true)
      expect(rateLimit(key, 1, 60_000).ok).toBe(false)
    })

    it('a very large limit never blocks within a single test', () => {
      const key = 'ip:huge-limit'
      for (let i = 0; i < 100; i++) {
        expect(rateLimit(key, 10_000, 60_000).ok).toBe(true)
      }
    })
  })
})
