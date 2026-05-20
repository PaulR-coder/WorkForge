import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import TeamCard from './TeamCard'
import InviteButton from './InviteButton'
import PendingInvites from './PendingInvites'
import { getTenantFilter } from '@/lib/tenant'

const TeamMap = dynamic(() => import('./TeamMap'), { ssr: false })

export default async function TeamPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const tenantFilter = getTenantFilter(session)
  const canEdit = can(session.role, 'manageUsers')

  const canViewMap = can(session.role, 'viewTeamMap')

  const [users, invites] = await Promise.all([
    prisma.user.findMany({
      where: tenantFilter,
      select: { id: true, name: true, email: true, phone: true, role: true, initials: true, company: true, specialty: true, active: true },
      orderBy: { name: 'asc' },
    }),
    canEdit
      ? prisma.invite.findMany({
          where: { ...tenantFilter, usedAt: null, expiresAt: { gt: new Date() } },
          select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
  ])

  return (
    <div className="page-padding" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Team</h1>
          <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>{users.filter(u => u.active).length} active users</div>
        </div>
        {canEdit && <InviteButton />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, marginBottom: invites.length > 0 ? 24 : 0 }}>
        {users.map(u => (
          <TeamCard key={u.id} user={u} canEdit={canEdit} />
        ))}
      </div>

      {canEdit && invites.length > 0 && (
        <PendingInvites initialInvites={invites.map(i => ({ ...i, createdAt: i.createdAt.toISOString(), expiresAt: i.expiresAt.toISOString() }))} />
      )}

      {canViewMap && <TeamMap />}
    </div>
  )
}
