import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantFilter = getTenantFilter(session)
  const users = await prisma.user.findMany({
    where: tenantFilter,
    select: { id: true, name: true, email: true, role: true, initials: true, company: true, specialty: true, active: true },
    orderBy: { name: 'asc' },
  })

  return Response.json(users)
}
