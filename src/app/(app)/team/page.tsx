import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TeamCard from './TeamCard'
import InviteButton from './InviteButton'
import PendingInvites from './PendingInvites'
import TeamMapWrapper from './TeamMapWrapper'
import { getTenantFilter } from '@/lib/tenant'

const ROLE_ORDER: Record<string, number> = {
  superadmin: 0, admin: 1, dispatcher: 2, tech: 3, readonly: 4,
}

export default async function TeamPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const tenantFilter = getTenantFilter(session)
  const canEdit    = can(session.role, 'manageUsers')
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

  const sorted = [...users].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))
  const active = users.filter(u => u.active).length
  const groups = Array.from(new Set(sorted.map(u => u.role)))

  return (
    <div style={{ padding: '24px 24px 48px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.4px' }}>Team</h1>
          <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 3 }}>
            {active} active member{active !== 1 ? 's' : ''}
            {users.length > active ? ` · ${users.length - active} inactive` : ''}
          </div>
        </div>
        {canEdit && <InviteButton />}
      </div>

      {/* Pending invites */}
      {canEdit && invites.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <PendingInvites initialInvites={invites.map(i => ({
            ...i,
            createdAt: i.createdAt.toISOString(),
            expiresAt: i.expiresAt.toISOString(),
          }))} />
        </div>
      )}

      {/* Team grid — grouped by role */}
      {groups.map(role => {
        const group = sorted.filter(u => u.role === role)
        const ROLE_LABEL: Record<string, string> = {
          superadmin: 'Super Admins', admin: 'Admins', dispatcher: 'Dispatchers',
          tech: 'Technicians', readonly: 'Read-only',
        }
        return (
          <div key={role} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text4)',
              textTransform: 'uppercase', letterSpacing: '.8px',
              marginBottom: 10,
            }}>
              {ROLE_LABEL[role] ?? role} ({group.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {group.map(u => <TeamCard key={u.id} user={u} canEdit={canEdit} />)}
            </div>
          </div>
        )
      })}

      {/* Map */}
      {canViewMap && <TeamMapWrapper />}
    </div>
  )
}
