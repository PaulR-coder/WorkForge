import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import JobsBoard from '@/components/jobs/JobsBoard'
import { getTenantFilter } from '@/lib/tenant'

type Props = { searchParams: Promise<{ status?: string; type?: string }> }

export default async function JobsPage({ searchParams }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const tenantFilter = getTenantFilter(session)
  const techFilter = session.role === 'tech' ? { techId: session.id } : {}

  const [jobs, users] = await Promise.all([
    prisma.job.findMany({
      where: { ...tenantFilter, ...techFilter, archivedAt: null },
      include: { tech: { select: { id: true, name: true, initials: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { role: { in: ['tech', 'dispatcher', 'admin'] }, active: true, ...tenantFilter },
      select: { id: true, name: true, initials: true, role: true },
    }),
  ])

  const params = await searchParams
  return <JobsBoard initialJobs={jobs} users={users} session={session} initialStatusFilter={params.status} initialTypeFilter={params.type} />
}
