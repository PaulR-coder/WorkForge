import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AppShell from '@/components/layout/AppShell'
import { LangProvider } from '@/components/LangProvider'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  return (
    <LangProvider>
      <AppShell session={session}>{children}</AppShell>
    </LangProvider>
  )
}
