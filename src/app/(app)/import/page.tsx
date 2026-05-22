import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { can } from '@/lib/permissions'
import ImportClient from './ImportClient'

export default async function ImportPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'importData')) redirect('/jobs')

  return <ImportClient />
}
