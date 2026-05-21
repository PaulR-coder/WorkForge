import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'
import { emailInvoiceToClient } from '@/lib/email'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'createInvoice')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const { id } = await params
  const tenantFilter = getTenantFilter(session)
  const invoice = await db.invoice.findFirst({ where: { id, ...tenantFilter } })
  if (!invoice) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const clientEmail = (body.clientEmail ?? invoice.clientEmail ?? '').trim()

  if (!clientEmail) {
    return Response.json({ error: 'Client email required' }, { status: 400 })
  }

  // Persist email if it was provided and wasn't stored
  if (clientEmail !== invoice.clientEmail) {
    await db.invoice.update({ where: { id }, data: { clientEmail, status: 'sent' } })
  } else {
    await db.invoice.update({ where: { id }, data: { status: 'sent' } })
  }

  const tenant = await db.tenant.findFirst({ where: { id: session.tenantId ?? '' } })
  const companyName = tenant?.name ?? session.company ?? 'WorkForge'

  void emailInvoiceToClient(clientEmail, companyName, {
    number: invoice.number,
    client: invoice.client,
    labor: invoice.labor,
    parts: invoice.parts,
    surcharge: invoice.surcharge,
    total: invoice.total,
    dueDate: invoice.dueDate,
  })

  void db.auditLog.create({
    data: {
      icon: '💰', action: 'Invoice emailed', severity: 'info',
      detail: `${invoice.number} → ${clientEmail}`,
      userId: session.id, tenantId: session.tenantId,
    },
  })

  return Response.json({ ok: true, clientEmail })
}
