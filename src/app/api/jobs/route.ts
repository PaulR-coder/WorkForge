import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter, requireTenantId } from '@/lib/tenant'
import { emailJobAssigned } from '@/lib/email'
import { smsJobAssigned } from '@/lib/sms'
import { sendPushToUser } from '@/lib/push'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const db = tenantPrisma(session)

  const tenantFilter = getTenantFilter(session)
  const where = {
    ...tenantFilter,
    archivedAt: null,
    ...(session.role === 'tech' ? { techId: session.id } : {}),
  }

  const jobs = await db.job.findMany({
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
  const db = tenantPrisma(session)

  const body = await req.json()
  const tenantId = requireTenantId(session)
  const tenantFilter = getTenantFilter(session)

  if (body.techId != null) {
    const tech = await db.user.findFirst({ where: { id: body.techId, ...tenantFilter } })
    if (!tech) return Response.json({ error: 'Invalid technician' }, { status: 400 })
  }

  const job = await db.job.create({
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

  await db.auditLog.create({
    data: { icon: '🔧', action: 'Job created', detail: `${job.client} — ${job.type}`, severity: 'info', userId: session.id, tenantId },
  })

  if (job.tech) {
    const jobData = { client: job.client, address: job.address, type: job.type, priority: job.priority }
    void emailJobAssigned(job.tech.email, job.tech.name, jobData)
    if (job.tech.phone) void smsJobAssigned(job.tech.phone, jobData)
    const subs = await db.pushSubscription.findMany({ where: { userId: job.tech.id } })
    if (subs.length > 0) {
      void sendPushToUser(subs, {
        title: 'New Job Assigned',
        body: `${job.type} — ${job.client} · ${job.address.split(',')[0]}`,
        url: '/field',
      })
    }
  }

  return Response.json({ ...job, tech: job.tech ? { id: job.tech.id, name: job.tech.name, initials: job.tech.initials } : null }, { status: 201 })
}
