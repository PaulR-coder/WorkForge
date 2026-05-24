import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/apiError'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)
  if (!can(session.role, 'manageUsers')) return apiError('Forbidden', 403)

  const { userId } = await params

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, tenantId: true },
  })
  if (!target) return apiError('User not found', 404)

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
