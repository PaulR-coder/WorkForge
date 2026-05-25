import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AppShell from '@/components/layout/AppShell'
import { LangProvider } from '@/components/LangProvider'
import { ToastProvider } from '@/components/Toast'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? '/'

  let subscriptionStatus: string | null = null
  let currentPeriodEnd: string | null = null
  let pastDueAt: string | null = null

  // Superadmin always has full access
  if (session.role !== 'superadmin' && session.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { subscriptionStatus: true, trialEndsAt: true, currentPeriodEnd: true, pastDueAt: true },
    })

    if (tenant) {
      subscriptionStatus = tenant.subscriptionStatus
      currentPeriodEnd = tenant.currentPeriodEnd?.toISOString() ?? null
      pastDueAt = tenant.pastDueAt?.toISOString() ?? null

      const now = new Date()

      // Trial expired
      const trialExpired =
        tenant.subscriptionStatus === 'trialing' &&
        tenant.trialEndsAt !== null &&
        tenant.trialEndsAt < now

      // Past due: 3-day grace period from first failure
      const pastDueLocked =
        tenant.subscriptionStatus === 'past_due' &&
        tenant.pastDueAt !== null &&
        new Date(tenant.pastDueAt.getTime() + 3 * 24 * 60 * 60 * 1000) < now

      // Cancelled: allow access until end of paid billing period
      const cancelledLocked =
        tenant.subscriptionStatus === 'cancelled' &&
        (tenant.currentPeriodEnd === null || tenant.currentPeriodEnd < now)

      const blocked = trialExpired || pastDueLocked || cancelledLocked

      if (blocked && !pathname.startsWith('/billing')) {
        redirect('/billing')
      }
    }
  }

  return (
    <LangProvider>
      <ToastProvider>
        <AppShell session={session} subscriptionStatus={subscriptionStatus} currentPeriodEnd={currentPeriodEnd} pastDueAt={pastDueAt}>{children}</AppShell>
      </ToastProvider>
    </LangProvider>
  )
}
