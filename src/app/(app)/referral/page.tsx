import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getOrCreateReferralCode } from '@/lib/referral'
import ReferralClient from './ReferralClient'

export default async function ReferralPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'manageBilling')) redirect('/jobs')

  const tenantId = session.tenantId
  if (!tenantId) redirect('/jobs')

  const code = await getOrCreateReferralCode(tenantId, session.id, session.company)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.getworkforge.com'
  const link = `${appUrl}/ref/${code}`

  const referralCode = await prisma.referralCode.findUnique({
    where: { code },
    include: { uses: true },
  })

  const uses = referralCode?.uses.length ?? 0
  const conversions = referralCode?.uses.filter(u => u.status === 'converted').length ?? 0

  return (
    <ReferralClient
      code={code}
      link={link}
      uses={uses}
      conversions={conversions}
      role={session.role}
    />
  )
}
