import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TeamCard from './TeamCard'
import InviteButton from './InviteButton'
import { getTenantFilter } from '@/lib/tenant'

export default async function TeamPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const tenantFilter = getTenantFilter(session)
  const users = await prisma.user.findMany({
    where: tenantFilter,
    select: { id: true, name: true, email: true, phone: true, role: true, initials: true, company: true, specialty: true, active: true },
    orderBy: { name: 'asc' },
  })

  const canEdit = can(session.role, 'manageUsers')

  return (
    <div className="page-padding" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Team</h1>
          <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>{users.filter(u => u.active).length} active users</div>
        </div>
        {canEdit && <InviteButton />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {users.map(u => (
          <TeamCard key={u.id} user={u} canEdit={canEdit} />
        ))}
      </div>
    </div>
  )
}
