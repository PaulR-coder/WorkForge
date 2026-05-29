import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageSettings')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!session.tenantId) return Response.json({ connections: [] })

  const connections = await prisma.socialConnection.findMany({
    where: { tenantId: session.tenantId },
    select: { id: true, platform: true, accountId: true, accountName: true, tokenExpiry: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return Response.json({ connections })
}
