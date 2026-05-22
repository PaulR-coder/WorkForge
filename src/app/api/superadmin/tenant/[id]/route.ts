import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cache } from '@/lib/cache'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'superadmin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  // Cache the heavy multi-query tenant detail for 300 s (5 min).
  // The superadmin action route (toggle_active, extend_trial) invalidates this key.
  const cacheKey = `tenant:${id}`
  const cached = await cache.get(cacheKey)
  if (cached !== null) return Response.json(cached)

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const [tenant, users, jobsThisMonth, totalJobs, totalRevenue] = await Promise.all([
    prisma.tenant.findUnique({ where: { id } }),
    prisma.user.findMany({
      where: { tenantId: id },
      select: { id: true, name: true, email: true, initials: true, role: true, active: true, createdAt: true },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.job.count({ where: { tenantId: id, createdAt: { gte: monthStart } } }),
    prisma.job.count({ where: { tenantId: id } }),
    prisma.payment.aggregate({ where: { tenantId: id }, _sum: { amount: true } }),
  ])

  if (!tenant) return Response.json({ error: 'Not found' }, { status: 404 })

  const payload = {
    ...tenant,
    createdAt: tenant.createdAt.toISOString(),
    trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: tenant.currentPeriodEnd?.toISOString() ?? null,
    users: users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })),
    jobsThisMonth,
    totalJobs,
    totalRevenue: totalRevenue._sum.amount ?? 0,
  }

  await cache.set(cacheKey, payload, 300)

  return Response.json(payload)
}
