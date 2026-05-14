import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'viewFinancials')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const payments = await prisma.payment.findMany({
    include: { collectedBy: { select: { name: true, initials: true } }, job: { select: { client: true, type: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json(payments)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'collectPayment')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const payment = await prisma.payment.create({
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
    },
    include: { collectedBy: { select: { name: true, initials: true } } },
  })

  await prisma.auditLog.create({
    data: { icon: '💳', action: 'Payment collected', detail: `$${body.amount} via ${body.method}`, severity: 'info', userId: session.id },
  })

  return Response.json(payment, { status: 201 })
}
