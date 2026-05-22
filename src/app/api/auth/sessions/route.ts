import { getSession, clearSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Get last login from audit log
  const lastLoginLog = await prisma.auditLog.findFirst({
    where: { userId: session.id, action: 'Login' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  return Response.json({
    currentSession: {
      name: session.name,
      email: session.email,
      role: session.role,
      lastLogin: lastLoginLog?.createdAt?.toISOString() ?? null,
    },
  })
}

export async function DELETE() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Clear current session cookie
  await clearSession()

  return Response.json({ success: true })
}
