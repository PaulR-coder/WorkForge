import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import SocialAccountsClient from './SocialAccountsClient'

export default async function SocialAccountsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'manageSettings')) redirect('/jobs')
  return <SocialAccountsClient />
}
