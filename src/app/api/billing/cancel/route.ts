import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/apiError'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)
  if (!session.tenantId) return apiError('No tenant context', 400)
  if (!['admin', 'superadmin'].includes(session.role)) {
    return apiError('Forbidden', 403)
  }

  let reason: string | undefined
  try {
    const body = await request.json()
    if (body && typeof body.reason === 'string' && body.reason.trim()) {
      reason = body.reason.trim()
    }
  } catch {
    // body is optional — ignore parse errors
  }

  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: { subscriptionStatus: 'cancelled' },
  })

  await prisma.auditLog.create({
    data: {
      icon: '🚫',
      action: 'subscription_cancelled',
      detail: reason ? `Cancellation reason: ${reason}` : 'Subscription cancelled',
      severity: 'warn',
      userId: session.id,
      tenantId: session.tenantId,
    },
  })

  return Response.json({ success: true })
}
