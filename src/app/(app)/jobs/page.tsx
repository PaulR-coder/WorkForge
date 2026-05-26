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

  const [jobs, users, jobTypeRecords] = await Promise.all([
    prisma.job.findMany({
      where: { ...tenantFilter, ...techFilter, archivedAt: null },
      include: { tech: { select: { id: true, name: true, initials: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { role: { in: ['tech', 'dispatcher', 'admin'] }, active: true, ...tenantFilter },
      select: { id: true, name: true, initials: true, role: true },
    }),
    session.tenantId
      ? prisma.jobType.findMany({ where: { tenantId: session.tenantId }, orderBy: { name: 'asc' } })
      : Promise.resolve([]),
  ])

  const jobTypes = jobTypeRecords.map(jt => jt.name)
  const params = await searchParams
  return <JobsBoard initialJobs={jobs} users={users} session={session} jobTypes={jobTypes} initialStatusFilter={params.status} initialTypeFilter={params.type} />
}
