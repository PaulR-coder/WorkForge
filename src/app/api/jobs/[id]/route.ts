import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'
import { emailJobAssigned, emailJobCompleted } from '@/lib/email'
import { smsJobAssigned } from '@/lib/sms'
import { sendPushToUser } from '@/lib/push'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tenantFilter = getTenantFilter(session)
  const job = await prisma.job.findFirst({
    where: { id, ...tenantFilter },
    include: {
      tech: { select: { id: true, name: true, initials: true } },
      invoices: true,
      messages: { include: { author: { select: { name: true, initials: true, role: true } } }, orderBy: { createdAt: 'asc' } },
      equipment: true,
    },
  })

  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(job)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'editJob')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const tenantFilter = getTenantFilter(session)

  const prev = await prisma.job.findFirst({ where: { id, ...tenantFilter }, select: { techId: true, status: true, client: true, type: true, updatedAt: true } })
  if (!prev) return Response.json({ error: 'Not found' }, { status: 404 })

  // Optimistic lock check — when a mutation was queued offline, the SW stamps
  // x-wf-queued-at with the time it was queued. If another write landed after
  // that time, a conflict occurred and we return 409 so the client can notify
  // the user instead of silently overwriting someone else's work.
  if (!body.action) {
    const queuedAt = req.headers.get('x-wf-queued-at')
    if (queuedAt) {
      const queuedDate = new Date(queuedAt)
      if (!isNaN(queuedDate.getTime()) && prev.updatedAt > queuedDate) {
        return Response.json({
          error: 'conflict',
          message: 'This job was updated while you were offline',
        }, { status: 409 })
      }
    }
  }

  // Archive / restore actions
  if (body.action === 'archive') {
    if (!can(session.role, 'archiveJob')) return Response.json({ error: 'Forbidden' }, { status: 403 })
    await prisma.job.update({ where: { id }, data: { archivedAt: new Date() } })
    void prisma.auditLog.create({
      data: { icon: '📋', action: 'Job archived', detail: `${prev.client} — ${prev.type}`, severity: 'info', userId: session.id, tenantId: session.tenantId },
    })
    return Response.json({ ok: true })
  }
  if (body.action === 'restore') {
    if (!can(session.role, 'archiveJob')) return Response.json({ error: 'Forbidden' }, { status: 403 })
    await prisma.job.update({ where: { id }, data: { archivedAt: null } })
    void prisma.auditLog.create({
      data: { icon: '📋', action: 'Job restored', detail: `${prev.client} — ${prev.type}`, severity: 'info', userId: session.id, tenantId: session.tenantId },
    })
    return Response.json({ ok: true })
  }

  // Validate the technician belongs to this tenant before assigning
  if (body.techId !== undefined && body.techId !== null) {
    const tech = await prisma.user.findFirst({ where: { id: body.techId, ...tenantFilter } })
    if (!tech) return Response.json({ error: 'Invalid technician' }, { status: 400 })
  }

  const job = await prisma.job.update({
    where: { id },
    data: {
      ...(body.client !== undefined && { client: body.client }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.techId !== undefined && { techId: body.techId }),
      ...(body.scheduledAt !== undefined && { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null }),
      ...(body.status === 'done' && { completedAt: new Date() }),
    },
    include: { tech: { select: { id: true, name: true, initials: true, email: true, phone: true } } },
  })

  await prisma.auditLog.create({
    data: { icon: '✏️', action: 'Job updated', detail: `${job.client} → ${job.status}`, severity: 'info', userId: session.id, tenantId: session.tenantId },
  })

  const techActuallyChanged = body.techId !== undefined && body.techId !== prev?.techId && job.tech
  if (techActuallyChanged && job.tech) {
    const jobData = { client: job.client, address: job.address, type: job.type, priority: job.priority }
    void emailJobAssigned(job.tech.email, job.tech.name, jobData)
    if (job.tech.phone) void smsJobAssigned(job.tech.phone, jobData)
    const subs = await prisma.pushSubscription.findMany({ where: { userId: job.tech.id } })
    if (subs.length > 0) {
      void sendPushToUser(subs, {
        title: 'New Job Assigned',
        body: `${job.type} — ${job.client} · ${job.address.split(',')[0]}`,
        url: '/field',
      })
    }
  }

  if (body.status === 'done' && prev?.status !== 'done') {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin'] }, active: true, ...tenantFilter },
      select: { email: true },
    })
    void emailJobCompleted(admins.map(a => a.email), { client: job.client, address: job.address, type: job.type })
  }

  return Response.json({ ...job, tech: job.tech ? { id: job.tech.id, name: job.tech.name, initials: job.tech.initials } : null })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'deleteJob')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const tenantFilter = getTenantFilter(session)
  const job = await prisma.job.findFirst({ where: { id, ...tenantFilter } })
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })

  await prisma.message.deleteMany({ where: { jobId: id } })
  await prisma.photo.deleteMany({ where: { jobId: id } })
  await prisma.invoice.updateMany({ where: { jobId: id }, data: { jobId: null } })
  await prisma.payment.updateMany({ where: { jobId: id }, data: { jobId: null } })
  await prisma.job.delete({ where: { id } })
  await prisma.auditLog.create({
    data: { icon: '🗑', action: 'Job deleted', detail: `${job.client} — ${job.type}`, severity: 'warn', userId: session.id, tenantId: session.tenantId },
  })

  return Response.json({ ok: true })
}
