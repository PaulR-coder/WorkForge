import { getSession } from '@/lib/auth'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'
import { sendPushToUser } from '@/lib/push'
import { Role } from '@/generated/prisma/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const db = tenantPrisma(session)

  const { id } = await params
  const tenantFilter = getTenantFilter(session)
  const job = await db.job.findFirst({ where: { id, ...tenantFilter } })
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })

  const messages = await db.message.findMany({
    where: { jobId: id },
    include: { author: { select: { name: true, initials: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return Response.json(messages)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const db = tenantPrisma(session)

  const { id } = await params
  const { body } = await req.json()
  if (!body?.trim()) return Response.json({ error: 'Empty message' }, { status: 400 })

  const tenantFilter = getTenantFilter(session)
  const job = await db.job.findFirst({ where: { id, ...tenantFilter } })
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })

  const message = await db.message.create({
    data: { jobId: id, authorId: session.id, body: body.trim(), tenantId: session.tenantId },
    include: { author: { select: { name: true, initials: true, role: true } } },
  })

  // Push notification to relevant recipients (fire-and-forget)
  const isTech = session.role === 'tech'
  const recipientFilter = isTech
    ? { tenantId: session.tenantId ?? undefined, role: { in: [Role.admin, Role.dispatcher] }, id: { not: session.id } }
    : job.techId ? { id: job.techId } : null

  if (recipientFilter) {
    db.pushSubscription.findMany({
      where: { user: recipientFilter },
    }).then(subs => {
      if (subs.length === 0) return
      sendPushToUser(subs, {
        title: `New message — ${job.client}`,
        body: `${session.name}: ${body.trim().slice(0, 100)}`,
        url: isTech ? '/dashboard' : '/field',
      })
    }).catch(() => {})
  }

  return Response.json(message, { status: 201 })
}
