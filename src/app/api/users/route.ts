import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const canManage = can(session.role, 'manageUsers')
  const canAssign = can(session.role, 'assignTech')

  // Techs and readonly have no need to browse the team list
  if (!canManage && !canAssign) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const tenantFilter = getTenantFilter(session)
  const users = await prisma.user.findMany({
    where: tenantFilter,
    select: {
      id: true,
      name: true,
      // Only admins who can manage users see emails
      email: canManage,
      role: true,
      initials: true,
      company: true,
      specialty: true,
      active: true,
    },
    orderBy: { name: 'asc' },
  })

  return Response.json(users)
}
