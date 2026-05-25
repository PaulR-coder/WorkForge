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

  // Superadmin always has full access
  let subscriptionStatus: string | null = null
  if (session.role !== 'superadmin' && session.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { subscriptionStatus: true, trialEndsAt: true },
    })

    if (tenant) {
      subscriptionStatus = tenant.subscriptionStatus

      const trialExpired =
        tenant.subscriptionStatus === 'trialing' &&
        tenant.trialEndsAt !== null &&
        tenant.trialEndsAt < new Date()

      const blocked =
        trialExpired || tenant.subscriptionStatus === 'cancelled'

      if (blocked && !pathname.startsWith('/billing')) {
        redirect('/billing')
      }
    }
  }

  return (
    <LangProvider>
      <ToastProvider>
        <AppShell session={session} subscriptionStatus={subscriptionStatus}>{children}</AppShell>
      </ToastProvider>
    </LangProvider>
  )
}
