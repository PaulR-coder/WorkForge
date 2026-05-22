import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getOrCreateReferralCode, generateReferralCode } from '@/lib/referral'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageBilling')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!session.tenantId) return Response.json({ error: 'No tenant' }, { status: 400 })

  const code = await getOrCreateReferralCode(session.tenantId, session.id, session.company)

  const referralCode = await prisma.referralCode.findUnique({
    where: { code },
    include: { uses: true },
  })

  const uses = referralCode?.uses.length ?? 0
  const conversions = referralCode?.uses.filter(u => u.status === 'converted').length ?? 0
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.getworkforge.com'
  const link = `${appUrl}/ref/${code}`

  return Response.json({ code, link, uses, conversions })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageBilling')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!session.tenantId) return Response.json({ error: 'No tenant' }, { status: 400 })

  let body: { action?: string } = {}
  try { body = await request.json() } catch { /* ignore */ }

  if (body.action !== 'regenerate') {
    return Response.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Delete old code + uses (cascade), then create a fresh one
  await prisma.referralCode.deleteMany({ where: { tenantId: session.tenantId } })

  const newCode = generateReferralCode(session.company || 'WORKFORGE')
  await prisma.referralCode.create({
    data: { tenantId: session.tenantId, userId: session.id, code: newCode },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.getworkforge.com'
  return Response.json({ code: newCode, link: `${appUrl}/ref/${newCode}` })
}
