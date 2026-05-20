import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({ ok: true, timestamp: new Date().toISOString() })
  } catch {
    return Response.json({ ok: false, error: 'Database unreachable' }, { status: 503 })
  }
}
