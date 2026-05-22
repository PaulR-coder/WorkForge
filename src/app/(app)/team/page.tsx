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

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admins', admin: 'Admins', dispatcher: 'Dispatchers',
  tech: 'Technicians', readonly: 'Read-only',
}

const ROLE_COLOR: Record<string, string> = {
  superadmin: 'var(--purple)',
  admin: 'var(--amber)',
  dispatcher: 'var(--blue-light)',
  tech: 'var(--green)',
  readonly: 'var(--text4)',
}

export default async function TeamPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Non-impersonating superadmin has no tenant context — redirect to Command Center
  if (session.role === 'superadmin' && !session.impersonating) redirect('/superadmin')

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

  // Role pill counts for header
  const roleCounts = {
    admin: users.filter(u => u.role === 'admin').length,
    dispatcher: users.filter(u => u.role === 'dispatcher').length,
    tech: users.filter(u => u.role === 'tech').length,
  }

  return (
    <div style={{ padding: '28px 28px 56px', maxWidth: 1140 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <h1 style={{
              fontSize: 28, fontWeight: 700, color: 'var(--text)',
              fontFamily: 'var(--font-display)', letterSpacing: '-.3px', margin: 0,
            }}>
              Team
            </h1>
            <span style={{ fontSize: 13, color: 'var(--text4)', fontFamily: 'var(--font-body)' }}>
              {active} active{users.length > active ? ` · ${users.length - active} inactive` : ''}
            </span>
          </div>
          {/* Role count pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([
              { role: 'admin', label: 'Admin', count: roleCounts.admin },
              { role: 'dispatcher', label: 'Dispatcher', count: roleCounts.dispatcher },
              { role: 'tech', label: 'Tech', count: roleCounts.tech },
            ] as const).filter(r => r.count > 0).map(r => (
              <span key={r.role} style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: `color-mix(in srgb, ${ROLE_COLOR[r.role]} 12%, transparent)`,
                color: ROLE_COLOR[r.role],
                border: `1px solid color-mix(in srgb, ${ROLE_COLOR[r.role]} 28%, transparent)`,
                letterSpacing: '.2px', fontFamily: 'var(--font-body)',
              }}>
                {r.count} {r.label}{r.count !== 1 ? 's' : ''}
              </span>
            ))}
          </div>
        </div>
        {canEdit && <InviteButton />}
      </div>

      {/* ── Pending invites ── */}
      {canEdit && invites.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <PendingInvites initialInvites={invites.map(i => ({
            ...i,
            createdAt: i.createdAt.toISOString(),
            expiresAt: i.expiresAt.toISOString(),
          }))} />
        </div>
      )}

      {/* ── Team grid — grouped by role ── */}
      {groups.map(role => {
        const group = sorted.filter(u => u.role === role)
        return (
          <div key={role} style={{ marginBottom: 32 }}>
            {/* Group header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: ROLE_COLOR[role] ?? 'var(--text4)',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '.9px',
                fontFamily: 'var(--font-display)',
              }}>
                {ROLE_LABEL[role] ?? role}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: 'var(--bg3)', color: 'var(--text4)', border: '1px solid var(--border)',
              }}>
                {group.length}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Card grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}>
              {group.map(u => <TeamCard key={u.id} user={u} canEdit={canEdit} />)}
            </div>
          </div>
        )
      })}

      {/* ── Map ── */}
      {canViewMap && <TeamMapWrapper />}
    </div>
  )
}
