import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'
import { emailInvoiceUpdate } from '@/lib/email'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'editInvoice')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const tenantFilter = getTenantFilter(session)

  const existing = await prisma.invoice.findFirst({ where: { id, ...tenantFilter } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.status === 'paid' && { paidAt: new Date() }),
    },
  })

  await prisma.auditLog.create({
    data: { icon: '💰', action: `Invoice ${body.status}`, detail: `${invoice.number} — ${invoice.client}`, severity: 'info', userId: session.id, tenantId: session.tenantId },
  })

  if (body.status === 'sent' || body.status === 'paid') {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin'] }, active: true, ...tenantFilter },
      select: { email: true },
    })
    void emailInvoiceUpdate(admins.map(a => a.email), { number: invoice.number, client: invoice.client, total: invoice.total }, body.status)
  }

  return Response.json(invoice)
}
