import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import FieldView from './FieldView'

export default async function FieldPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const notDone = { notIn: ['done' as const] }
  const where = session.role === 'tech'
    ? { techId: session.id, status: notDone }
    : { status: notDone }

  const jobs = await prisma.job.findMany({
    where,
    include: { tech: { select: { id: true, name: true, initials: true } } },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  })

  const serialized = jobs.map(j => ({
    ...j,
    scheduledAt: j.scheduledAt?.toISOString() ?? null,
    completedAt: j.completedAt?.toISOString() ?? null,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  }))

  return <FieldView initialJobs={serialized} session={session} />
}
