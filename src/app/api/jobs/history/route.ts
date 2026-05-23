import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'viewHistory')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  const tenantFilter = getTenantFilter(session)

  const dateFilter = (from || to) ? {
    createdAt: {
      ...(from ? { gte: new Date(from) }                    : {}),
      ...(to   ? { lte: new Date(to + 'T23:59:59.999Z') }  : {}),
    },
  } : {}

  const jobs = await db.job.findMany({
    where: {
      ...tenantFilter,
      ...dateFilter,
      OR: [{ status: 'done' }, { archivedAt: { not: null } }, { deletedAt: { not: null } }],
    },
    include: {
      tech: { select: { id: true, name: true, initials: true } },
      invoices: { select: { total: true, status: true } },
    },
    orderBy: { completedAt: 'desc' },
    take: 500,
  })

  return Response.json(jobs)
}
