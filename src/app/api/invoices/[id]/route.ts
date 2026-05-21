import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'
import { emailInvoiceUpdate } from '@/lib/email'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'editInvoice')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const { id } = await params
  const body = await req.json()
  const tenantFilter = getTenantFilter(session)

  const existing = await db.invoice.findFirst({ where: { id, ...tenantFilter }, select: { updatedAt: true, number: true, client: true } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const queuedAt = req.headers.get('x-wf-queued-at')
  if (queuedAt) {
    const queuedDate = new Date(queuedAt)
    if (!isNaN(queuedDate.getTime()) && existing.updatedAt > queuedDate) {
      return Response.json({ error: 'conflict', message: 'Invoice was updated while you were offline' }, { status: 409 })
    }
  }

  const invoice = await db.invoice.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.status === 'paid' && { paidAt: new Date() }),
    },
  })

  await db.auditLog.create({
    data: { icon: '💰', action: `Invoice ${body.status}`, detail: `${invoice.number} — ${invoice.client}`, severity: 'info', userId: session.id, tenantId: session.tenantId },
  })

  if (body.status === 'sent' || body.status === 'paid') {
    const admins = await db.user.findMany({
      where: { role: { in: ['admin'] }, active: true, ...tenantFilter },
      select: { email: true },
    })
    void emailInvoiceUpdate(admins.map(a => a.email), { number: invoice.number, client: invoice.client, total: invoice.total }, body.status)
  }

  return Response.json(invoice)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'editInvoice')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const { id } = await params
  const tenantFilter = getTenantFilter(session)

  const existing = await db.invoice.findFirst({ where: { id, ...tenantFilter } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  await db.invoice.delete({ where: { id } })

  await db.auditLog.create({
    data: { icon: '🗑', action: 'Invoice deleted', detail: `${existing.number} — ${existing.client}`, severity: 'warn', userId: session.id, tenantId: session.tenantId },
  })

  return Response.json({ ok: true })
}
