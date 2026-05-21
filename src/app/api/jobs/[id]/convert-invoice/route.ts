import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter, requireTenantId } from '@/lib/tenant'

type LineItem = { description: string; hours?: number; qty?: number; unitPrice: number; total: number }

function lineItemsToAmounts(items: LineItem[]) {
  let labor = 0, parts = 0, surcharge = 0
  for (const item of items) {
    if (/surcharge|service call|trip charge|travel fee|dispatch/i.test(item.description)) {
      surcharge += item.total
    } else if (item.hours !== undefined && item.hours > 0) {
      labor += item.total
    } else {
      parts += item.total
    }
  }
  return {
    labor: Math.round(labor * 100) / 100,
    parts: Math.round(parts * 100) / 100,
    surcharge: Math.round(surcharge * 100) / 100,
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'createInvoice')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const { id } = await params
  const tenantFilter = getTenantFilter(session)
  const tenantId = requireTenantId(session)

  const job = await db.job.findFirst({
    where: { id, ...tenantFilter },
    include: { estimate: true },
  })
  if (!job) return Response.json({ error: 'Job not found' }, { status: 404 })
  if (!job.estimate) return Response.json({ error: 'No estimate linked to this job' }, { status: 400 })

  const lineItems = Array.isArray(job.estimate.lineItems) ? job.estimate.lineItems as unknown as LineItem[] : []
  const { labor, parts, surcharge } = lineItemsToAmounts(lineItems)
  const total = job.estimate.subtotal

  const count = await db.invoice.count({ where: { tenantId } })
  const number = `INV-${String(count + 100).padStart(3, '0')}`

  const invoice = await db.invoice.create({
    data: {
      number,
      client: job.client,
      clientEmail: job.estimate.clientEmail || '',
      jobId: job.id,
      labor,
      parts,
      surcharge,
      total,
      status: 'draft',
      dueDate: new Date(Date.now() + 15 * 86400000),
      tenantId,
    },
  })

  void db.auditLog.create({
    data: {
      icon: '💰', action: 'Invoice created from estimate', severity: 'info',
      detail: `${invoice.number} — ${invoice.client} ($${invoice.total.toFixed(2)})`,
      userId: session.id, tenantId,
    },
  })

  return Response.json(invoice, { status: 201 })
}
