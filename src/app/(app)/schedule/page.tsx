import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getTenantFilter } from '@/lib/tenant'
import ScheduleCalendar from '@/components/schedule/ScheduleCalendar'

export default async function SchedulePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const tenantFilter = getTenantFilter(session)
  const users = await prisma.user.findMany({
    where: { active: true, ...tenantFilter },
    select: { id: true, name: true, initials: true, role: true },
  })

  return <ScheduleCalendar session={session} users={users} />
}
