import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import FeedbackClient from './FeedbackClient'

export default async function FeedbackPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const isAdmin = can(session.role, 'manageSettings')
  return <FeedbackClient currentUserId={session.id} isAdmin={isAdmin} />
}
