import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { can } from '@/lib/permissions'
import { Suspense } from 'react'
import BillingClient from './BillingClient'

export default async function BillingPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'manageBilling')) redirect('/dashboard')

  const tenant = session.tenantId
    ? await prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: {
          name: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          currentPeriodEnd: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
        },
      })
    : null

  return (
    <Suspense fallback={null}>
      <BillingClient
        tenantName={tenant?.name ?? 'Your Account'}
        subscriptionStatus={tenant?.subscriptionStatus ?? 'trialing'}
        trialEndsAt={tenant?.trialEndsAt?.toISOString() ?? null}
        currentPeriodEnd={tenant?.currentPeriodEnd?.toISOString() ?? null}
        hasStripeCustomer={!!tenant?.stripeCustomerId}
        hasSubscription={!!tenant?.stripeSubscriptionId}
      />
    </Suspense>
  )
}
