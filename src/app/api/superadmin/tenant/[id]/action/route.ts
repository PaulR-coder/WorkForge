import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'superadmin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const { action } = await req.json()

  const tenant = await prisma.tenant.findUnique({ where: { id } })
  if (!tenant) return Response.json({ error: 'Not found' }, { status: 404 })

  if (action === 'toggle_active') {
    const updated = await prisma.tenant.update({
      where: { id },
      data: { active: !tenant.active },
    })
    return Response.json({ active: updated.active })
  }

  if (action === 'extend_trial') {
    const current = tenant.trialEndsAt && tenant.trialEndsAt > new Date()
      ? tenant.trialEndsAt
      : new Date()
    const trialEndsAt = new Date(current.getTime() + 14 * 86400000)
    await prisma.tenant.update({
      where: { id },
      data: { trialEndsAt, subscriptionStatus: 'trialing' },
    })
    return Response.json({ trialEndsAt: trialEndsAt.toISOString() })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}
