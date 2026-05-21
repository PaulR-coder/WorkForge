import { getSession } from '@/lib/auth'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'
import { can } from '@/lib/permissions'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'createEstimate')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const { id } = await params
  const tenantFilter = getTenantFilter(session)
  const existing = await db.estimate.findFirst({ where: { id, ...tenantFilter } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { client, jobType, description, lineItems, subtotal, notes, status } = body

  const estimate = await db.estimate.update({
    where: { id },
    data: {
      ...(client !== undefined && { client }),
      ...(jobType !== undefined && { jobType }),
      ...(description !== undefined && { description }),
      ...(lineItems !== undefined && { lineItems }),
      ...(subtotal !== undefined && { subtotal }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
    },
    include: { createdBy: { select: { name: true, initials: true } } },
  })

  return Response.json(estimate)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'createEstimate')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const { id } = await params
  const tenantFilter = getTenantFilter(session)
  const existing = await db.estimate.findFirst({ where: { id, ...tenantFilter } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  await db.estimate.delete({ where: { id } })
  return Response.json({ ok: true })
}
