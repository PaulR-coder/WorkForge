import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'viewTeamMap')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const tenantFilter = getTenantFilter(session)

  const [techs, equipmentRaw] = await Promise.all([
    db.user.findMany({
      where: {
        sharingLocation: true,
        lat: { not: null },
        lng: { not: null },
        locatedAt: { not: null },
        active: true,
        ...tenantFilter,
      },
      select: { id: true, name: true, initials: true, role: true, lat: true, lng: true, locatedAt: true },
      orderBy: { name: 'asc' },
    }),
    db.equipment.findMany({
      where: { ...tenantFilter, lat: { not: null }, lng: { not: null } },
      select: { id: true, name: true, client: true, icon: true, lat: true, lng: true, locatedAt: true, assignedJobId: true },
    }),
  ])

  // Cast nulls away — the where clause guarantees these fields are non-null
  const users = techs.map(t => ({
    ...t,
    lat: t.lat!,
    lng: t.lng!,
    locatedAt: t.locatedAt!.toISOString(),
  }))

  const equipment = equipmentRaw.map(e => ({
    ...e,
    lat: e.lat!,
    lng: e.lng!,
    locatedAt: e.locatedAt ? e.locatedAt.toISOString() : null,
  }))

  return Response.json({ users, equipment })
}
