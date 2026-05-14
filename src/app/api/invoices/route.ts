import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'viewFinancials') && session.role !== 'dispatcher') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const invoices = await prisma.invoice.findMany({
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
  const count = await prisma.invoice.count()
  const number = `INV-${String(count + 100).padStart(3, '0')}`

  const invoice = await prisma.invoice.create({
    data: {
      number,
      client: body.client,
      jobId: body.jobId ?? null,
      labor: body.labor ?? 0,
      parts: body.parts ?? 0,
      surcharge: body.surcharge ?? 0,
      total: (body.labor ?? 0) + (body.parts ?? 0) + (body.surcharge ?? 0),
      status: 'draft',
      dueDate: new Date(Date.now() + 15 * 86400000),
    },
  })

  await prisma.auditLog.create({
    data: { icon: '💰', action: 'Invoice created', detail: `${invoice.number} — ${invoice.client}`, severity: 'info', userId: session.id },
  })

  return Response.json(invoice, { status: 201 })
}
