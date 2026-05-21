import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter, requireTenantId } from '@/lib/tenant'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'viewEquipment')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const tenantFilter = getTenantFilter(session)
  const equipment = await db.equipment.findMany({ where: tenantFilter, orderBy: { client: 'asc' } })
  return Response.json(equipment)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'editEquipment')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const body = await req.json()
  const tenantId = requireTenantId(session)

  if (!body.client?.trim() || !body.name?.trim() || !body.brand?.trim() || !body.model?.trim()) {
    return Response.json({ error: 'Client, name, brand, and model are required' }, { status: 400 })
  }
  const installedAt = new Date(body.installedAt)
  if (isNaN(installedAt.getTime())) {
    return Response.json({ error: 'Invalid installation date' }, { status: 400 })
  }

  const eq = await db.equipment.create({
    data: {
      client: body.client,
      name: body.name,
      brand: body.brand,
      model: body.model,
      serialNumber: body.serialNumber,
      icon: body.icon ?? '⚙',
      installedAt,
      warrantyEnd: body.warrantyEnd ? new Date(body.warrantyEnd) : null,
      intervalDays: body.intervalDays ?? 90,
      notes: body.notes ?? '',
      tenantId,
    },
  })

  await db.auditLog.create({
    data: { icon: '⚙', action: 'Equipment added', detail: `${eq.name} — ${eq.client}`, severity: 'info', userId: session.id, tenantId },
  })

  return Response.json(eq, { status: 201 })
}
