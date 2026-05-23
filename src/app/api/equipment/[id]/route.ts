import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'editEquipment')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const { id } = await params
  const body = await req.json()
  const tenantFilter = getTenantFilter(session)

  const existing = await db.equipment.findFirst({ where: { id, ...tenantFilter }, select: { updatedAt: true, name: true, client: true } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const queuedAt = req.headers.get('x-wf-queued-at')
  if (queuedAt) {
    const queuedDate = new Date(queuedAt)
    if (!isNaN(queuedDate.getTime()) && existing.updatedAt > queuedDate) {
      return Response.json({ error: 'conflict', message: 'Equipment was updated while you were offline' }, { status: 409 })
    }
  }

  const { lat, lng, locatedAt, assignedJobId, ...rest } = body

  const updateData = {
    ...(rest.notes !== undefined && { notes: rest.notes }),
    ...(rest.lastPMDaysAgo !== undefined && { lastPMDaysAgo: rest.lastPMDaysAgo }),
    ...(rest.totalServices !== undefined && { totalServices: rest.totalServices }),
    ...(lat           !== undefined ? { lat }           : {}),
    ...(lng           !== undefined ? { lng }           : {}),
    ...(locatedAt     !== undefined ? { locatedAt: locatedAt ? new Date(locatedAt) : null } : {}),
    ...(assignedJobId !== undefined ? { assignedJobId } : {}),
  }

  const eq = await db.equipment.update({
    where: { id },
    data: updateData,
  })

  return Response.json(eq)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'editEquipment')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const { id } = await params
  const tenantFilter = getTenantFilter(session)

  const existing = await db.equipment.findFirst({ where: { id, ...tenantFilter } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  await db.equipment.delete({ where: { id } })

  await db.auditLog.create({
    data: { icon: '🗑', action: 'Equipment deleted', detail: `${existing.name} — ${existing.client}`, severity: 'warn', userId: session.id, tenantId: session.tenantId },
  })

  return Response.json({ ok: true })
}
