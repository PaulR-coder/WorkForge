import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AppShell from '@/components/layout/AppShell'
import { LangProvider } from '@/components/LangProvider'
import { ToastProvider } from '@/components/Toast'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  return (
    <LangProvider>
      <ToastProvider>
        <AppShell session={session}>{children}</AppShell>
      </ToastProvider>
    </LangProvider>
  )
}
