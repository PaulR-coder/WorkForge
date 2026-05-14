import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'viewEquipment')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const equipment = await prisma.equipment.findMany({ orderBy: { client: 'asc' } })
  return Response.json(equipment)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'editEquipment')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const eq = await prisma.equipment.create({
    data: {
      client: body.client,
      name: body.name,
      brand: body.brand,
      model: body.model,
      serialNumber: body.serialNumber,
      icon: body.icon ?? '⚙',
      installedAt: new Date(body.installedAt),
      warrantyEnd: body.warrantyEnd ? new Date(body.warrantyEnd) : null,
      intervalDays: body.intervalDays ?? 90,
      notes: body.notes ?? '',
    },
  })

  await prisma.auditLog.create({
    data: { icon: '⚙', action: 'Equipment added', detail: `${eq.name} — ${eq.client}`, severity: 'info', userId: session.id },
  })

  return Response.json(eq, { status: 201 })
}
