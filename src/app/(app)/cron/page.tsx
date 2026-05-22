import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { can } from '@/lib/permissions'
import { RunNowButton } from './RunNowButton'

const SEV_COLOR: Record<string, string> = {
  info:  '#5ba3f5',
  warn:  'var(--amber)',
  error: 'var(--red)',
}

const SEV_BG: Record<string, string> = {
  info:  'rgba(91,163,245,.1)',
  warn:  'rgba(245,158,11,.1)',
  error: 'rgba(239,68,68,.1)',
}

const SEV_BORDER: Record<string, string> = {
  info:  'rgba(91,163,245,.22)',
  warn:  'rgba(245,158,11,.22)',
  error: 'rgba(239,68,68,.22)',
}

export default async function CronPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'manageSettings')) redirect('/jobs')

  // ── Fetch last 10 cron-related audit entries ──────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recentLogs: any[] = []
  let logsError = false
  try {
    recentLogs = await prisma.auditLog.findMany({
      where: {
        ...(session.role !== 'superadmin' && session.tenantId
          ? { tenantId: session.tenantId }
          : {}),
        action: {
          in: ['PM Alert', 'Invoice Overdue', 'Contract Renewal Due'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
  } catch (err) {
    console.error('[CronPage] Failed to load audit logs:', err)
    logsError = true
  }

  // ── Aggregate counts per worker type ──────────────────────────────────
  let pmCount = 0
  let invoiceCount = 0
  let contractCount = 0
  let statsError = false
  try {
    const tenantFilter =
      session.role !== 'superadmin' && session.tenantId
        ? { tenantId: session.tenantId }
        : {}

    const [pm, inv, con] = await Promise.all([
      prisma.auditLog.count({ where: { ...tenantFilter, action: 'PM Alert' } }),
      prisma.auditLog.count({ where: { ...tenantFilter, action: 'Invoice Overdue' } }),
      prisma.auditLog.count({ where: { ...tenantFilter, action: 'Contract Renewal Due' } }),
    ])
    pmCount = pm
    invoiceCount = inv
    contractCount = con
  } catch (err) {
    console.error('[CronPage] Failed to load stats:', err)
    statsError = true
  }

  return (
    <div style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>
            ⏱
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.3px', margin: 0, fontFamily: 'var(--font-display)' }}>
            Background Workers
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text4)', margin: 0, paddingLeft: 52 }}>
          Scheduled jobs for PM alerts, invoice reminders, and contract renewals.
        </p>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      {statsError ? (
        <div style={{
          background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.2)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: 'var(--red)',
        }}>
          Could not load statistics — database unavailable.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { icon: '🔧', label: 'PM Alerts Sent', count: pmCount, color: 'var(--amber)' },
            { icon: '💰', label: 'Invoice Reminders Sent', count: invoiceCount, color: 'var(--red)' },
            { icon: '📑', label: 'Contract Renewals Notified', count: contractCount, color: '#5ba3f5' },
          ].map(({ icon, label, count, color }) => (
            <div key={label} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px 20px',
            }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1, marginBottom: 4, fontFamily: 'var(--font-display)' }}>
                {count.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text4)' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Setup instructions ──────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '22px 24px', marginBottom: 24,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4, marginTop: 0 }}>
          Production Setup (Railway)
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text4)', marginBottom: 18, lineHeight: 1.6 }}>
          Use Railway&apos;s built-in cron service to call this endpoint on a schedule. For security, set a
          shared secret so only your cron service can trigger the workers.
        </p>

        <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <li style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.65 }}>
            <strong style={{ color: 'var(--text)' }}>Add an env var</strong> in your Railway service:{' '}
            <code style={{
              display: 'inline-block', background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '2px 8px', fontSize: 12, fontFamily: 'monospace',
              color: 'var(--amber)',
            }}>
              CRON_SECRET=&lt;a long random string&gt;
            </code>
          </li>
          <li style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.65 }}>
            <strong style={{ color: 'var(--text)' }}>In Railway, add a Cron job</strong> with the following config:
            <div style={{
              marginTop: 10, background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 16px', fontFamily: 'monospace', fontSize: 12,
              display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 16px',
              color: 'var(--text)',
            }}>
              <span style={{ color: 'var(--text4)' }}>URL</span>
              <span style={{ color: 'var(--amber)' }}>https://your-domain.com/api/cron</span>
              <span style={{ color: 'var(--text4)' }}>Method</span>
              <span>GET</span>
              <span style={{ color: 'var(--text4)' }}>Header</span>
              <span>Authorization: Bearer <em style={{ color: 'var(--amber)' }}>{'{CRON_SECRET}'}</em></span>
              <span style={{ color: 'var(--text4)' }}>Schedule</span>
              <span>0 8 * * *  <span style={{ color: 'var(--text4)', fontSize: 11 }}>(daily at 8 AM UTC)</span></span>
            </div>
          </li>
          <li style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.65 }}>
            <strong style={{ color: 'var(--text)' }}>Optionally set</strong>{' '}
            <code style={{
              display: 'inline-block', background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '2px 8px', fontSize: 12, fontFamily: 'monospace',
              color: 'var(--amber)',
            }}>
              RESEND_API_KEY
            </code>{' '}
            to enable email notifications for PM alerts, invoice reminders, and contract renewals.
          </li>
        </ol>
      </div>

      {/* ── What each worker does ────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '22px 24px', marginBottom: 24,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 16, marginTop: 0 }}>
          Workers
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              icon: '🔧',
              name: 'PM Alerts',
              description: 'Checks all equipment. If the time since last service (lastPMDaysAgo) is within 7 days of the service interval or already past it, an audit entry is created and admin/dispatcher users are emailed.',
            },
            {
              icon: '💰',
              name: 'Invoice Reminders',
              description: 'Finds invoices with status "overdue" or status "sent" with a past due date. Creates an audit entry and sends a reminder email to the client email on the invoice.',
            },
            {
              icon: '📑',
              name: 'Contract Renewals',
              description: 'Finds active contracts whose nextDueDate is within 30 days. Creates an audit entry and emails admin/dispatcher users so they can schedule the next service visit.',
            },
          ].map(({ icon, name, description }) => (
            <div key={name} style={{
              display: 'flex', gap: 14, padding: '14px 16px',
              background: 'var(--bg3)', borderRadius: 10,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: 'var(--bg2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>
                {icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{name}</div>
                <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.6 }}>{description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Manual run ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '22px 24px', marginBottom: 24,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4, marginTop: 0 }}>
          Run Manually
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text4)', marginBottom: 18, lineHeight: 1.6 }}>
          Trigger all workers immediately. Useful for testing or backfilling missed runs.
          {!process.env.CRON_SECRET && (
            <span style={{ color: 'var(--amber)', fontWeight: 600 }}>
              {' '}Note: CRON_SECRET is not set — only localhost requests are allowed.
            </span>
          )}
        </p>
        <RunNowButton />
      </div>

      {/* ── Recent log entries ──────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Recent Activity
          </h2>
          <span style={{ fontSize: 11, color: 'var(--text4)' }}>Last 10 cron-generated entries</span>
        </div>

        {logsError ? (
          <div style={{ padding: '20px 20px', fontSize: 13, color: 'var(--red)' }}>
            Could not load audit log — database unavailable.
          </div>
        ) : recentLogs.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text4)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🕐</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>No activity yet</div>
            <div style={{ fontSize: 12 }}>Cron log entries will appear here after the first run.</div>
          </div>
        ) : (
          recentLogs.map((log, i) => {
            const color = SEV_COLOR[log.severity] ?? SEV_COLOR.info
            const bg    = SEV_BG[log.severity]    ?? SEV_BG.info
            const border = SEV_BORDER[log.severity] ?? SEV_BORDER.info
            return (
              <div key={log.id} style={{
                display: 'grid',
                gridTemplateColumns: '36px 1fr max-content',
                alignItems: 'center',
                gap: 12,
                padding: '12px 20px',
                borderBottom: i < recentLogs.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                {/* Icon */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: bg, border: `1px solid ${border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                }}>
                  {log.icon}
                </div>

                {/* Action + detail */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                    {log.action}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text4)', lineHeight: 1.4 }}>
                    {log.detail}
                  </div>
                </div>

                {/* Timestamp + severity */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color,
                    background: bg, border: `1px solid ${border}`,
                    borderRadius: 20, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '.4px',
                  }}>
                    {log.severity}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'monospace' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
