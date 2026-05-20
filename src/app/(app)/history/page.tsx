import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { can } from '@/lib/permissions'
import { getTenantFilter } from '@/lib/tenant'
import HistoryClient from './HistoryClient'

export default async function HistoryPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'viewHistory')) redirect('/dashboard')

  const tenantFilter = getTenantFilter(session)

  const jobs = await prisma.job.findMany({
    where: {
      ...tenantFilter,
      OR: [{ status: 'done' }, { archivedAt: { not: null } }],
    },
    include: {
      tech: { select: { id: true, name: true, initials: true } },
      invoices: { select: { total: true, status: true } },
    },
    orderBy: { completedAt: 'desc' },
    take: 500,
  })

  const serialized = jobs.map(j => ({
    ...j,
    createdAt: j.createdAt.toISOString(),
    completedAt: j.completedAt?.toISOString() ?? null,
    archivedAt: j.archivedAt?.toISOString() ?? null,
    status: j.status as string,
    priority: j.priority as string,
    invoices: j.invoices.map(inv => ({ total: inv.total, status: inv.status as string })),
  }))

  return <HistoryClient initialJobs={serialized} session={session} />
}
