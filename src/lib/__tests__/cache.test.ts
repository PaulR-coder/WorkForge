/**
 * Unit tests for src/lib/cache.ts
 *
 * cache.ts wraps ioredis with graceful fallback:
 *   - When REDIS_URL is absent → all operations are silent no-ops
 *   - When Redis throws        → errors are swallowed, null / undefined returned
 *
 * We mock 'ioredis' so no real Redis connection is made.
 */

// ---------------------------------------------------------------------------
// Mock ioredis before any imports that pull it in transitively.
// ---------------------------------------------------------------------------

const mockGet  = jest.fn()
const mockSet  = jest.fn()
const mockDel  = jest.fn()
const mockScan = jest.fn()

// Event-emitter callbacks registered by the module
const eventHandlers: Record<string, () => void> = {}

const MockRedis = jest.fn().mockImplementation(() => ({
  on: (event: string, cb: () => void) => { eventHandlers[event] = cb },
  get:  mockGet,
  set:  mockSet,
  del:  mockDel,
  scan: mockScan,
}))

jest.mock('ioredis', () => MockRedis)

// ---------------------------------------------------------------------------
// Helpers to reload the module with a fresh singleton state
// ---------------------------------------------------------------------------

function loadCache() {
  jest.resetModules()
  // Re-apply the mock after resetModules clears the registry
  jest.mock('ioredis', () => MockRedis)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/lib/cache') as typeof import('@/lib/cache')
}

// ---------------------------------------------------------------------------
// Tests: no REDIS_URL (default CI/test environment)
// ---------------------------------------------------------------------------

describe('cache — no REDIS_URL (Redis unavailable)', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL
    MockRedis.mockClear()
    mockGet.mockClear()
    mockSet.mockClear()
    mockDel.mockClear()
    mockScan.mockClear()
  })

  it('cache.get returns null without attempting a Redis call', async () => {
    const { cache } = loadCache()
    const result = await cache.get('some-key')
    expect(result).toBeNull()
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('cache.set is a silent no-op — does not call Redis', async () => {
    const { cache } = loadCache()
    await expect(cache.set('some-key', { foo: 'bar' })).resolves.toBeUndefined()
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('cache.del is a silent no-op', async () => {
    const { cache } = loadCache()
    await expect(cache.del('some-key')).resolves.toBeUndefined()
    expect(mockDel).not.toHaveBeenCalled()
  })

  it('cache.flush is a silent no-op', async () => {
    const { cache } = loadCache()
    await expect(cache.flush('jobs:*')).resolves.toBeUndefined()
    expect(mockScan).not.toHaveBeenCalled()
  })

  it('isRedisAvailable() returns false', () => {
    const { isRedisAvailable } = loadCache()
    expect(isRedisAvailable()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Tests: REDIS_URL set, Redis client connected
// ---------------------------------------------------------------------------

describe('cache — REDIS_URL set, Redis available', () => {
  beforeEach(() => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    MockRedis.mockClear()
    mockGet.mockReset()
    mockSet.mockReset()
    mockDel.mockReset()
    mockScan.mockReset()
  })

  afterEach(() => {
    delete process.env.REDIS_URL
  })

  it('cache.get returns parsed value from Redis', async () => {
    mockGet.mockResolvedValue(JSON.stringify({ id: 1 }))
    const { cache } = loadCache()
    const result = await cache.get<{ id: number }>('job:1')
    expect(result).toEqual({ id: 1 })
  })

  it('cache.get returns null on cache miss (Redis returns null)', async () => {
    mockGet.mockResolvedValue(null)
    const { cache } = loadCache()
    const result = await cache.get('missing-key')
    expect(result).toBeNull()
  })

  it('cache.set calls Redis with JSON-stringified value and TTL', async () => {
    mockSet.mockResolvedValue('OK')
    const { cache } = loadCache()
    await cache.set('job:1', { id: 1 }, 30)
    expect(mockSet).toHaveBeenCalledWith('job:1', JSON.stringify({ id: 1 }), 'EX', 30)
  })

  it('cache.set uses default TTL of 60 when none provided', async () => {
    mockSet.mockResolvedValue('OK')
    const { cache } = loadCache()
    await cache.set('job:1', 'data')
    expect(mockSet).toHaveBeenCalledWith('job:1', JSON.stringify('data'), 'EX', 60)
  })

  it('cache.del calls Redis.del with the correct key', async () => {
    mockDel.mockResolvedValue(1)
    const { cache } = loadCache()
    await cache.del('job:1')
    expect(mockDel).toHaveBeenCalledWith('job:1')
  })

  it('cache.del accepts an array of keys', async () => {
    mockDel.mockResolvedValue(2)
    const { cache } = loadCache()
    await cache.del(['job:1', 'job:2'])
    expect(mockDel).toHaveBeenCalledWith('job:1', 'job:2')
  })
})

// ---------------------------------------------------------------------------
// Tests: graceful error handling (Redis throws)
// ---------------------------------------------------------------------------

describe('cache — graceful fallback when Redis throws', () => {
  beforeEach(() => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    MockRedis.mockClear()
    mockGet.mockReset()
    mockSet.mockReset()
    mockDel.mockReset()
    mockScan.mockReset()
  })

  afterEach(() => {
    delete process.env.REDIS_URL
  })

  it('cache.get returns null when Redis.get throws', async () => {
    mockGet.mockRejectedValue(new Error('ECONNREFUSED'))
    const { cache } = loadCache()
    const result = await cache.get('key')
    expect(result).toBeNull()
  })

  it('cache.set resolves without throwing when Redis.set throws', async () => {
    mockSet.mockRejectedValue(new Error('ECONNREFUSED'))
    const { cache } = loadCache()
    await expect(cache.set('key', 'value')).resolves.toBeUndefined()
  })

  it('cache.del resolves without throwing when Redis.del throws', async () => {
    mockDel.mockRejectedValue(new Error('ECONNREFUSED'))
    const { cache } = loadCache()
    await expect(cache.del('key')).resolves.toBeUndefined()
  })

  it('cache.flush resolves without throwing when Redis.scan throws', async () => {
    mockScan.mockRejectedValue(new Error('ECONNREFUSED'))
    const { cache } = loadCache()
    await expect(cache.flush('jobs:*')).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Tests: flush() pagination via SCAN cursor
// ---------------------------------------------------------------------------

describe('cache.flush() — SCAN cursor pagination', () => {
  beforeEach(() => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    MockRedis.mockClear()
    mockScan.mockReset()
    mockDel.mockReset()
  })

  afterEach(() => {
    delete process.env.REDIS_URL
  })

  it('stops scanning when cursor returns to "0"', async () => {
    // First SCAN call: returns cursor "42" with some keys
    // Second SCAN call: returns cursor "0" (done)
    mockScan
      .mockResolvedValueOnce(['42', ['jobs:1', 'jobs:2']])
      .mockResolvedValueOnce(['0', ['jobs:3']])
    mockDel.mockResolvedValue(1)

    const { cache } = loadCache()
    await cache.flush('jobs:*')

    expect(mockScan).toHaveBeenCalledTimes(2)
    expect(mockDel).toHaveBeenCalledTimes(2)
  })

  it('skips del when a SCAN page returns no keys', async () => {
    mockScan
      .mockResolvedValueOnce(['42', []]) // empty page
      .mockResolvedValueOnce(['0', ['jobs:1']])
    mockDel.mockResolvedValue(1)

    const { cache } = loadCache()
    await cache.flush('jobs:*')

    // del should only be called for the non-empty page
    expect(mockDel).toHaveBeenCalledTimes(1)
    expect(mockDel).toHaveBeenCalledWith('jobs:1')
  })
})
