import { getSession, revokeUserSessions } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageUsers')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const { id } = await params
  const tenantFilter = getTenantFilter(session)
  const target = await db.user.findFirst({ where: { id, ...tenantFilter } })
  if (!target) return Response.json({ error: 'Not found' }, { status: 404 })

  await revokeUserSessions(id)

  await db.auditLog.create({
    data: {
      icon: '🔐',
      action: 'Sessions revoked',
      detail: `${target.name} (${target.email})`,
      severity: 'warn',
      userId: session.id,
      tenantId: session.tenantId,
    },
  })

  return Response.json({ ok: true })
}
