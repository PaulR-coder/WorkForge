import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Reward tiers: conversions → reward description + dollar value
const TIERS = [
  { threshold: 1,  label: '$25 account credit',  value: 25  },
  { threshold: 3,  label: '$100 account credit', value: 100 },
  { threshold: 5,  label: '1 month FREE',        value: 150 },
  { threshold: 10, label: '2 months FREE',       value: 300 },
]

function calcReward(conversions: number): number {
  let reward = 0
  for (const tier of TIERS) {
    if (conversions >= tier.threshold) reward = tier.value
  }
  return reward
}

function nextTierThreshold(conversions: number): number | null {
  for (const tier of TIERS) {
    if (conversions < tier.threshold) return tier.threshold
  }
  return null
}

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageBilling')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!session.tenantId) return Response.json({ error: 'No tenant' }, { status: 400 })

  const referralCode = await prisma.referralCode.findUnique({
    where: { tenantId: session.tenantId },
    include: { uses: true },
  })

  if (!referralCode) {
    return Response.json({
      totalUses: 0,
      conversionsThisMonth: 0,
      conversionsLastMonth: 0,
      totalConversions: 0,
      rewardValue: 0,
      nextRewardAt: TIERS[0].threshold,
      tiers: TIERS,
    })
  }

  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const totalUses = referralCode.uses.length
  const totalConversions = referralCode.uses.filter(u => u.status === 'converted').length
  const conversionsThisMonth = referralCode.uses.filter(
    u => u.status === 'converted' && u.createdAt >= startOfThisMonth,
  ).length
  const conversionsLastMonth = referralCode.uses.filter(
    u => u.status === 'converted' && u.createdAt >= startOfLastMonth && u.createdAt < startOfThisMonth,
  ).length

  return Response.json({
    totalUses,
    totalConversions,
    conversionsThisMonth,
    conversionsLastMonth,
    rewardValue: calcReward(totalConversions),
    nextRewardAt: nextTierThreshold(totalConversions),
    tiers: TIERS,
  })
}
