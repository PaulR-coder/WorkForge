import { getSession } from '@/lib/auth'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'
import { can } from '@/lib/permissions'
import { apiError } from '@/lib/apiError'

export async function GET() {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)
  if (!can(session.role, 'createEstimate')) return apiError('Forbidden', 403)
  const db = tenantPrisma(session)
  const tenantFilter = getTenantFilter(session)

  const estimates = await db.estimate.findMany({
    where: tenantFilter,
    include: { createdBy: { select: { name: true, initials: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json(estimates)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)
  if (!can(session.role, 'createEstimate')) return apiError('Forbidden', 403)
  const db = tenantPrisma(session)

  const body = await req.json()
  const { client, jobType, description, lineItems, subtotal, notes } = body

  if (!client?.trim()) return apiError('Client is required', 400)

  const count = await db.estimate.count({ where: { tenantId: session.tenantId } })
  const number = `EST-${String(count + 1).padStart(3, '0')}`

  const estimate = await db.estimate.create({
    data: {
      number,
      client: client.trim(),
      jobType: jobType ?? '',
      description: description ?? '',
      lineItems: lineItems ?? [],
      subtotal: subtotal ?? 0,
      notes: notes ?? '',
      createdById: session.id,
      tenantId: session.tenantId,
    },
    include: { createdBy: { select: { name: true, initials: true } } },
  })

  return Response.json(estimate, { status: 201 })
}
