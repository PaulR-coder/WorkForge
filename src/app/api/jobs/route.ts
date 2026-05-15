import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getTenantFilter, requireTenantId } from '@/lib/tenant'
import { emailJobAssigned } from '@/lib/email'
import { smsJobAssigned } from '@/lib/sms'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantFilter = getTenantFilter(session)
  const where = {
    ...tenantFilter,
    ...(session.role === 'tech' ? { techId: session.id } : {}),
  }

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
  const tenantId = requireTenantId(session)

  const job = await prisma.job.create({
    data: {
      client: body.client,
      address: body.address,
      description: body.description ?? '',
      type: body.type,
      priority: body.priority ?? 'normal',
      status: body.status ?? 'open',
      techId: body.techId ?? null,
      tenantId,
    },
    include: { tech: { select: { id: true, name: true, initials: true, email: true, phone: true } } },
  })

  await prisma.auditLog.create({
    data: { icon: '🔧', action: 'Job created', detail: `${job.client} — ${job.type}`, severity: 'info', userId: session.id, tenantId },
  })

  if (job.tech) {
    const jobData = { client: job.client, address: job.address, type: job.type, priority: job.priority }
    void emailJobAssigned(job.tech.email, job.tech.name, jobData)
    if (job.tech.phone) void smsJobAssigned(job.tech.phone, jobData)
  }

  return Response.json({ ...job, tech: job.tech ? { id: job.tech.id, name: job.tech.name, initials: job.tech.initials } : null }, { status: 201 })
}
