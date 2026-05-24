import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TOKEN_LIMIT } from '@/lib/tokenUsage'
import { redirect } from 'next/navigation'
import SuperAdminClient from './SuperAdminClient'

export default async function SuperAdminPage() {
  const session = await getSession()
  if (!session || session.role !== 'superadmin') redirect('/dashboard')

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  const [tenants, jobGroups, activityGroups, tokenRows] = await Promise.all([
    prisma.tenant.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.job.groupBy({
      by: ['tenantId'],
      where: { createdAt: { gte: monthStart }, tenantId: { not: null } },
      _count: { _all: true },
    }),
    prisma.job.groupBy({
      by: ['tenantId'],
      where: { tenantId: { not: null } },
      _max: { updatedAt: true },
    }),
    prisma.tenantTokenUsage.findMany({
      where: { period },
      include: { tenant: { select: { name: true } } },
      orderBy: { tokensUsed: 'desc' },
    }),
  ])

  const enriched = tenants.map(t => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    active: t.active,
    createdAt: t.createdAt.toISOString(),
    subscriptionStatus: t.subscriptionStatus,
    trialEndsAt: t.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: t.currentPeriodEnd?.toISOString() ?? null,
    stripeCustomerId: t.stripeCustomerId,
    userCount: t._count.users,
    jobsThisMonth: jobGroups.find(j => j.tenantId === t.id)?._count._all ?? 0,
    lastActivity: activityGroups.find(a => a.tenantId === t.id)?._max.updatedAt?.toISOString() ?? t.createdAt.toISOString(),
  }))

  const activeCount = enriched.filter(t => t.subscriptionStatus === 'active').length
  const trialCount = enriched.filter(t => t.subscriptionStatus === 'trialing').length
  const totalUsers = tenants.reduce((s, t) => s + t._count.users, 0)
  const totalJobsThisMonth = jobGroups.reduce((s, j) => s + j._count._all, 0)
  const totalJobs = await prisma.job.count()
  // MRR = $39 base + $12/user per active tenant
  const mrr = enriched
    .filter(t => t.subscriptionStatus === 'active')
    .reduce((s, t) => s + 39 + t.userCount * 12, 0)

  const tokenUsage = tokenRows.map(r => ({
    tenantId: r.tenantId,
    tenantName: r.tenant.name,
    tokensUsed: r.tokensUsed,
    pct: Math.min(100, Math.round((r.tokensUsed / TOKEN_LIMIT) * 100)),
  }))
  const totalTokensThisMonth = tokenRows.reduce((s, r) => s + r.tokensUsed, 0)

  return (
    <SuperAdminClient
      tenants={enriched}
      stats={{ totalTenants: enriched.length, mrr, totalUsers, totalJobsThisMonth, activeCount, trialCount, totalJobs }}
      tokenUsage={tokenUsage}
      tokenLimit={TOKEN_LIMIT}
      totalTokensThisMonth={totalTokensThisMonth}
    />
  )
}
