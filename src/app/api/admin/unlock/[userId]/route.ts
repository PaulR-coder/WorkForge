import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageUsers')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await params

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, tenantId: true },
  })
  if (!target) return Response.json({ error: 'User not found' }, { status: 404 })

  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  })

  void prisma.auditLog.create({
    data: {
      icon: '🔓',
      action: 'Account Unlocked',
      detail: `Admin unlocked account for ${target.email}`,
      severity: 'info',
      userId: session.id,
      tenantId: session.tenantId,
    },
  })

  return Response.json({ success: true })
}
