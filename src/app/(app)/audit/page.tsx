import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { can } from '@/lib/permissions'
import { getTenantFilter } from '@/lib/tenant'

const SEV_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  info:  { color: '#5ba3f5', bg: 'rgba(91,163,245,.12)',  border: 'rgba(91,163,245,.25)'  },
  warn:  { color: 'var(--amber)', bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.25)' },
  error: { color: 'var(--red)',   bg: 'rgba(239,68,68,.12)',  border: 'rgba(239,68,68,.25)'  },
}

const ICON_BG: Record<string, string> = {
  info:  'rgba(91,163,245,.15)',
  warn:  'rgba(245,158,11,.15)',
  error: 'rgba(239,68,68,.15)',
}

export default async function AuditPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'viewAudit')) redirect('/jobs')

  const tenantFilter = getTenantFilter(session)
  const logs = await prisma.auditLog.findMany({
    where: tenantFilter,
    include: { user: { select: { name: true, initials: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: '.5px', marginBottom: 3 }}>Audit Log</h1>
        <div style={{ fontSize: 12, color: 'var(--text4)' }}>Immutable record of all system actions</div>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Column header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '36px 1fr 120px 100px 150px',
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg3)',
        }}>
          {['', 'Action', 'User', 'Severity', 'Timestamp'].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px' }}>{h}</div>
          ))}
        </div>

        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text4)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ display: 'block', margin: '0 auto 14px', color: 'var(--text4)' }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>No audit entries yet</div>
            <div style={{ fontSize: 12 }}>System actions will appear here</div>
          </div>
        ) : (
          logs.map((log, i) => {
            const sev = SEV_CONFIG[log.severity] ?? SEV_CONFIG.info
            const iconBg = ICON_BG[log.severity] ?? ICON_BG.info
            return (
              <div
                key={log.id}
                style={{
                  display: 'grid', gridTemplateColumns: '36px 1fr 120px 100px 150px',
                  alignItems: 'center', gap: 0,
                  padding: '11px 16px',
                  borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg3)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                {/* Icon */}
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                  {log.icon}
                </div>

                {/* Action + detail */}
                <div style={{ paddingRight: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{log.action}</div>
                  <div style={{ fontSize: 11, color: 'var(--text4)', lineHeight: 1.4 }}>{log.detail}</div>
                </div>

                {/* User avatar */}
                <div>
                  {log.user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', background: 'rgba(167,139,250,.18)',
                        color: 'var(--purple)', fontSize: 8, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {log.user.initials}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.user.name}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text4)' }}>System</span>
                  )}
                </div>

                {/* Severity badge */}
                <div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: sev.color,
                    background: sev.bg, border: `1px solid ${sev.border}`,
                    borderRadius: 20, padding: '3px 9px', textTransform: 'uppercase', letterSpacing: '.4px',
                  }}>
                    {log.severity}
                  </span>
                </div>

                {/* Timestamp */}
                <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
