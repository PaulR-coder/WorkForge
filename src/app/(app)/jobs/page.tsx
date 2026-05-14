import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import JobsBoard from '@/components/jobs/JobsBoard'

export default async function JobsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const where = session.role === 'tech' ? { techId: session.id } : {}

  const [jobs, users] = await Promise.all([
    prisma.job.findMany({
      where,
      include: { tech: { select: { id: true, name: true, initials: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { role: { in: ['tech', 'dispatcher', 'admin'] }, active: true },
      select: { id: true, name: true, initials: true, role: true },
    }),
  ])

  return <JobsBoard initialJobs={jobs} users={users} session={session} />
}
