import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'viewAudit')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const tenantFilter = getTenantFilter(session)
  const logs = await prisma.auditLog.findMany({
    where: tenantFilter,
    include: { user: { select: { name: true, initials: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return Response.json(logs)
}
