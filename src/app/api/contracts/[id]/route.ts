import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'editContracts')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const tenantFilter = getTenantFilter(session)

  const existing = await prisma.contract.findFirst({ where: { id, ...tenantFilter }, select: { updatedAt: true, name: true, client: true } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const queuedAt = req.headers.get('x-wf-queued-at')
  if (queuedAt) {
    const queuedDate = new Date(queuedAt)
    if (!isNaN(queuedDate.getTime()) && existing.updatedAt > queuedDate) {
      return Response.json({ error: 'conflict', message: 'Contract was updated while you were offline' }, { status: 409 })
    }
  }

  const contract = await prisma.contract.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.client !== undefined && { client: body.client }),
      ...(body.frequencyDays !== undefined && { frequencyDays: body.frequencyDays }),
      ...(body.pricePerVisit !== undefined && { pricePerVisit: body.pricePerVisit }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.active !== undefined && { active: body.active }),
    },
  })

  await prisma.auditLog.create({
    data: { icon: '📑', action: 'Contract updated', detail: `${contract.name} — ${contract.client}`, severity: 'info', userId: session.id, tenantId: session.tenantId },
  })

  return Response.json(contract)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'editContracts')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const tenantFilter = getTenantFilter(session)

  const existing = await prisma.contract.findFirst({ where: { id, ...tenantFilter } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  await prisma.contract.delete({ where: { id } })

  await prisma.auditLog.create({
    data: { icon: '🗑', action: 'Contract deleted', detail: `${existing.name} — ${existing.client}`, severity: 'warn', userId: session.id, tenantId: session.tenantId },
  })

  return Response.json({ ok: true })
}
