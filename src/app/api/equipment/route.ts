import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter, requireTenantId } from '@/lib/tenant'
import { z } from 'zod'

const CreateEquipmentSchema = z.object({
  client: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  serialNumber: z.string().min(1),
  icon: z.string().optional(),
  installedAt: z.string().min(1),
  warrantyEnd: z.string().optional().nullable(),
  intervalDays: z.number().int().min(1),
  notes: z.string().optional(),
})

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

  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  const result = CreateEquipmentSchema.safeParse(body)
  if (!result.success) return Response.json({ error: result.error.issues[0].message }, { status: 400 })

  const tenantId = requireTenantId(session)

  const installedAt = new Date(result.data.installedAt)
  if (isNaN(installedAt.getTime())) {
    return Response.json({ error: 'Invalid installation date' }, { status: 400 })
  }

  const eq = await db.equipment.create({
    data: {
      client: result.data.client,
      name: result.data.name,
      brand: result.data.brand,
      model: result.data.model,
      serialNumber: result.data.serialNumber,
      icon: result.data.icon ?? '⚙',
      installedAt,
      warrantyEnd: result.data.warrantyEnd ? new Date(result.data.warrantyEnd) : null,
      intervalDays: result.data.intervalDays,
      notes: result.data.notes ?? '',
      tenantId,
    },
  })

  await db.auditLog.create({
    data: { icon: '⚙', action: 'Equipment added', detail: `${eq.name} — ${eq.client}`, severity: 'info', userId: session.id, tenantId },
  })

  return Response.json(eq, { status: 201 })
}
