import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'
import { apiError } from '@/lib/apiError'

export async function GET() {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)
  if (!can(session.role, 'viewAudit')) return apiError('Forbidden', 403)
  const db = tenantPrisma(session)

  const tenantFilter = getTenantFilter(session)
  const logs = await db.auditLog.findMany({
    where: tenantFilter,
    include: { user: { select: { name: true, initials: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return Response.json(logs)
}
