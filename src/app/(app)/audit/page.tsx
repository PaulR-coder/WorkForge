import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { can } from '@/lib/permissions'

const SEV_COLORS: Record<string, string> = { info: 'var(--blue-light)', warn: 'var(--amber)', error: 'var(--red)' }

export default async function AuditPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'viewAudit')) redirect('/jobs')

  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { name: true, initials: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Audit Log</h1>
        <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>Immutable record of all system actions</div>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {logs.map((log, i) => {
          const c = SEV_COLORS[log.severity] ?? 'var(--text3)'
          return (
            <div key={log.id} style={{ padding: '10px 16px', borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 16 }}>{log.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{log.action}</div>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 1 }}>{log.detail}</div>
              </div>
              {log.user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg4)', color: 'var(--text3)', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {log.user.initials}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text4)' }}>{log.user.name}</span>
                </div>
              )}
              <span style={{ fontSize: 9, fontWeight: 700, color: c, background: `${c}18`, padding: '2px 7px', borderRadius: 20, border: `1px solid ${c}33`, textTransform: 'uppercase' }}>{log.severity}</span>
              <div style={{ fontSize: 10, color: 'var(--text4)', minWidth: 130, textAlign: 'right' }}>
                {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>
          )
        })}
        {logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text4)' }}>No audit entries yet</div>
        )}
      </div>
    </div>
  )
}
