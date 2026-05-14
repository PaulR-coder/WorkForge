import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const where = session.role === 'tech' ? { techId: session.id } :
                session.role === 'readonly' ? {} : {}

  const jobs = await prisma.job.findMany({
    where,
    include: { tech: { select: { id: true, name: true, initials: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json(jobs)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'createJob')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const job = await prisma.job.create({
    data: {
      client: body.client,
      address: body.address,
      description: body.description ?? '',
      type: body.type,
      priority: body.priority ?? 'normal',
      status: body.status ?? 'open',
      techId: body.techId ?? null,
    },
    include: { tech: { select: { id: true, name: true, initials: true } } },
  })

  await prisma.auditLog.create({
    data: { icon: '🔧', action: 'Job created', detail: `${job.client} — ${job.type}`, severity: 'info', userId: session.id },
  })

  return Response.json(job, { status: 201 })
}
