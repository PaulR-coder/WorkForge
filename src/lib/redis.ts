import Redis from 'ioredis'

let client: Redis | null = null

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null
  if (client) return client

  client = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    connectTimeout: 2000,
  })

  client.on('error', () => {
    // Silently degrade — rate limiter falls back to in-memory
  })

  return client
}
