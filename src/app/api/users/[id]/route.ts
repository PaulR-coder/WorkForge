import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageUsers')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const tenantFilter = getTenantFilter(session)

  const target = await prisma.user.findFirst({ where: { id, ...tenantFilter } })
  if (!target) return Response.json({ error: 'Not found' }, { status: 404 })

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(body.phone !== undefined && { phone: body.phone || null }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.specialty !== undefined && { specialty: body.specialty }),
    },
    select: { id: true, name: true, email: true, phone: true, role: true, initials: true, company: true, specialty: true, active: true },
  })

  await prisma.auditLog.create({
    data: { icon: '👤', action: 'User updated', detail: `${user.name}`, severity: 'info', userId: session.id, tenantId: session.tenantId },
  })

  return Response.json(user)
}
