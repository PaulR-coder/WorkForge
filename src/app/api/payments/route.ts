import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter, requireTenantId } from '@/lib/tenant'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'viewFinancials')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const tenantFilter = getTenantFilter(session)
  const payments = await db.payment.findMany({
    where: tenantFilter,
    include: { collectedBy: { select: { name: true, initials: true } }, job: { select: { client: true, type: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json(payments)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'collectPayment')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const body = await req.json()
  const tenantId = requireTenantId(session)

  const VALID_METHODS = ['card', 'cash', 'check', 'digital', 'other']
  if (!body.method || !VALID_METHODS.includes(body.method)) {
    return Response.json({ error: 'Invalid payment method' }, { status: 400 })
  }
  if (typeof body.amount !== 'number' || body.amount <= 0 || body.amount > 1_000_000) {
    return Response.json({ error: 'Amount must be a positive number' }, { status: 400 })
  }

  const payment = await db.payment.create({
    data: {
      jobId: body.jobId ?? null,
      invoiceId: body.invoiceId ?? null,
      collectedById: session.id,
      method: body.method,
      amount: body.amount,
      cashTendered: body.cashTendered ?? null,
      changeDue: body.changeDue ?? null,
      checkNumber: body.checkNumber ?? null,
      signature: body.signature ?? null,
      notes: body.notes ?? '',
      tenantId,
    },
    include: { collectedBy: { select: { name: true, initials: true } } },
  })

  await db.auditLog.create({
    data: { icon: '💳', action: 'Payment collected', detail: `$${body.amount} via ${body.method}`, severity: 'info', userId: session.id, tenantId },
  })

  return Response.json(payment, { status: 201 })
}
