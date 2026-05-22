import { isRedisAvailable } from '@/lib/cache'

export async function GET() {
  return Response.json({ status: 'ok', timestamp: Date.now(), redis: isRedisAvailable() })
}
