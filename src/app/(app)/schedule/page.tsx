import { getSession } from '@/lib/auth'
import { tenantPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getTenantFilter } from '@/lib/tenant'
import ScheduleCalendar from '@/components/schedule/ScheduleCalendar'

export default async function SchedulePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const db = tenantPrisma(session)
  const tenantFilter = getTenantFilter(session)

  const [users, teamMembers] = await Promise.all([
    db.user.findMany({
      where: { active: true, ...tenantFilter },
      select: { id: true, name: true, initials: true, role: true },
    }),
    db.user.findMany({
      where: { ...tenantFilter, active: true, role: { in: ['tech', 'dispatcher'] } },
      select: { id: true, name: true, initials: true, role: true, specialty: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return <ScheduleCalendar session={session} users={users} teamMembers={teamMembers} />
}
