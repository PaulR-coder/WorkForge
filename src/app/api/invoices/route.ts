import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getTenantFilter, requireTenantId } from '@/lib/tenant'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'viewFinancials') && session.role !== 'dispatcher') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenantFilter = getTenantFilter(session)
  const invoices = await prisma.invoice.findMany({
    where: tenantFilter,
    include: { job: { select: { id: true, client: true, type: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json(invoices)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'createInvoice')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const tenantId = requireTenantId(session)
  const tenantFilter = getTenantFilter(session)

  const labor = Number(body.labor ?? 0)
  const parts = Number(body.parts ?? 0)
  const surcharge = Number(body.surcharge ?? 0)
  if (labor < 0 || parts < 0 || surcharge < 0 || labor > 1_000_000 || parts > 1_000_000 || surcharge > 1_000_000) {
    return Response.json({ error: 'Invalid invoice amounts' }, { status: 400 })
  }
  if (!body.client || typeof body.client !== 'string' || body.client.trim().length === 0) {
    return Response.json({ error: 'Client name is required' }, { status: 400 })
  }

  const count = await prisma.invoice.count({ where: tenantFilter })
  const number = `INV-${String(count + 100).padStart(3, '0')}`

  const invoice = await prisma.invoice.create({
    data: {
      number,
      client: body.client.trim(),
      jobId: body.jobId ?? null,
      labor,
      parts,
      surcharge,
      total: labor + parts + surcharge,
      status: 'draft',
      dueDate: new Date(Date.now() + 15 * 86400000),
      tenantId,
    },
  })

  await prisma.auditLog.create({
    data: { icon: '💰', action: 'Invoice created', detail: `${invoice.number} — ${invoice.client}`, severity: 'info', userId: session.id, tenantId },
  })

  return Response.json(invoice, { status: 201 })
}
