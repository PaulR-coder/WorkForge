import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'viewTeamMap')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const tenantFilter = getTenantFilter(session)

  const techs = await prisma.user.findMany({
    where: {
      sharingLocation: true,
      lat: { not: null },
      lng: { not: null },
      active: true,
      ...tenantFilter,
    },
    select: { id: true, name: true, initials: true, role: true, lat: true, lng: true, locatedAt: true },
    orderBy: { name: 'asc' },
  })

  return Response.json(techs)
}
