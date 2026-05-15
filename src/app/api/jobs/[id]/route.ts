import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { emailJobAssigned, emailJobCompleted } from '@/lib/email'
import { smsJobAssigned } from '@/lib/sms'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
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

  const prev = await prisma.job.findUnique({ where: { id }, select: { techId: true, status: true } })

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
      ...(body.status === 'done' && { completedAt: new Date() }),
    },
    include: { tech: { select: { id: true, name: true, initials: true, email: true, phone: true } } },
  })

  await prisma.auditLog.create({
    data: { icon: '✏️', action: 'Job updated', detail: `${job.client} → ${job.status}`, severity: 'info', userId: session.id },
  })

  // Notify tech when newly assigned
  const techChanged = body.techId !== undefined && body.techId !== prev?.techId && body.techId !== null
  if (techChanged && job.tech) {
    const jobData = { client: job.client, address: job.address, type: job.type, priority: job.priority }
    void emailJobAssigned(job.tech.email, job.tech.name, jobData)
    if (job.tech.phone) void smsJobAssigned(job.tech.phone, jobData)
  }

  // Notify admins when job is completed
  if (body.status === 'done' && prev?.status !== 'done') {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['superadmin', 'admin'] }, active: true },
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
  const job = await prisma.job.findUnique({ where: { id } })
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })

  await prisma.job.delete({ where: { id } })
  await prisma.auditLog.create({
    data: { icon: '🗑', action: 'Job deleted', detail: `${job.client} — ${job.type}`, severity: 'warn', userId: session.id },
  })

  return Response.json({ ok: true })
}
