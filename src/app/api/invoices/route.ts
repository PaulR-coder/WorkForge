import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter, requireTenantId } from '@/lib/tenant'
import { z } from 'zod'

const CreateInvoiceSchema = z.object({
  client: z.string().min(1),
  clientEmail: z.string().email().optional(),
  jobId: z.string().optional().nullable(),
  labor: z.number().min(0),
  parts: z.number().min(0),
  surcharge: z.number().min(0),
  total: z.number().min(0).optional(),
  dueDate: z.string().min(1),
  status: z.enum(['draft', 'sent', 'paid', 'overdue']).optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'viewFinancials') && session.role !== 'dispatcher') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  const db = tenantPrisma(session)

  const tenantFilter = getTenantFilter(session)
  const invoices = await db.invoice.findMany({
    where: tenantFilter,
    include: {
      job: { select: { id: true, client: true, type: true, scheduledAt: true, description: true } },
      payments: { orderBy: { createdAt: 'desc' }, select: { id: true, amount: true, method: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json(invoices)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'createInvoice')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  const result = CreateInvoiceSchema.safeParse(body)
  if (!result.success) return Response.json({ error: result.error.issues[0].message }, { status: 400 })

  const tenantId = requireTenantId(session)
  const tenantFilter = getTenantFilter(session)

  const { labor, parts, surcharge } = result.data
  if (labor > 1_000_000 || parts > 1_000_000 || surcharge > 1_000_000) {
    return Response.json({ error: 'Invalid invoice amounts' }, { status: 400 })
  }

  const count = await db.invoice.count({ where: tenantFilter })
  const number = `INV-${String(count + 100).padStart(3, '0')}`

  const invoice = await db.invoice.create({
    data: {
      number,
      client: result.data.client.trim(),
      jobId: result.data.jobId ?? null,
      labor,
      parts,
      surcharge,
      total: labor + parts + surcharge,
      status: result.data.status ?? 'draft',
      dueDate: new Date(result.data.dueDate),
      tenantId,
    },
  })

  await db.auditLog.create({
    data: { icon: '💰', action: 'Invoice created', detail: `${invoice.number} — ${invoice.client}`, severity: 'info', userId: session.id, tenantId },
  })

  return Response.json(invoice, { status: 201 })
}
