import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import MarketingClient from './MarketingClient'

export default async function MarketingPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'manageSettings')) redirect('/jobs')

  return (
    <MarketingClient
      company={session.company ?? ''}
      name={session.name ?? ''}
    />
  )
}
