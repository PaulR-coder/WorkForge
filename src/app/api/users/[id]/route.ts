import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageUsers')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const { id } = await params
  const body = await req.json()
  const tenantFilter = getTenantFilter(session)

  const target = await db.user.findFirst({ where: { id, ...tenantFilter } })
  if (!target) return Response.json({ error: 'Not found' }, { status: 404 })

  const user = await db.user.update({
    where: { id },
    data: {
      ...(body.phone !== undefined && { phone: body.phone || null }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.specialty !== undefined && { specialty: body.specialty }),
    },
    select: { id: true, name: true, email: true, phone: true, role: true, initials: true, company: true, specialty: true, active: true },
  })

  await db.auditLog.create({
    data: { icon: '👤', action: 'User updated', detail: `${user.name}`, severity: 'info', userId: session.id, tenantId: session.tenantId },
  })

  return Response.json(user)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageUsers')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const { id } = await params
  if (id === session.id) return Response.json({ error: 'Cannot delete your own account' }, { status: 400 })

  const tenantFilter = getTenantFilter(session)
  const target = await db.user.findFirst({ where: { id, ...tenantFilter } })
  if (!target) return Response.json({ error: 'Not found' }, { status: 404 })

  // Clear nullable foreign keys before deleting
  await db.job.updateMany({ where: { techId: id }, data: { techId: null } })
  await db.auditLog.updateMany({ where: { userId: id }, data: { userId: null } })
  await db.message.deleteMany({ where: { authorId: id } })
  await db.user.delete({ where: { id } })

  await db.auditLog.create({
    data: { icon: '👤', action: 'User deleted', detail: `${target.name} (${target.email})`, severity: 'warn', userId: session.id, tenantId: session.tenantId },
  })

  return Response.json({ ok: true })
}
