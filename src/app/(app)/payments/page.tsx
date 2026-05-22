import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import { can } from '@/lib/permissions'

const METHOD_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  card:    { label: 'Card',    color: '#5ba3f5',       bg: 'rgba(91,163,245,.12)',  border: 'rgba(91,163,245,.25)',  icon: 'M1 6h22v2H1zM3 3h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v14h18V5H3z' },
  cash:    { label: 'Cash',   color: 'var(--green)',  bg: 'rgba(34,197,94,.12)',   border: 'rgba(34,197,94,.25)',   icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  check:   { label: 'Check',  color: 'var(--amber)',  bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.25)', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  digital: { label: 'Digital', color: 'var(--purple)', bg: 'rgba(167,139,250,.12)', border: 'rgba(167,139,250,.25)', icon: 'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z' },
}

export default async function PaymentsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'viewFinancials')) redirect('/jobs')

  const tenantFilter = getTenantFilter(session)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payments: any[] = []
  let dbError = false

  try {
    payments = await prisma.payment.findMany({
      where: tenantFilter,
      include: {
        collectedBy: { select: { name: true, initials: true } },
        job: { select: { client: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (err) {
    console.error('[PaymentsPage] DB error:', err)
    dbError = true
  }

  const total = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: '.5px', marginBottom: 3 }}>Payment Ledger</h1>
        <div style={{ fontSize: 12, color: 'var(--text4)' }}>All collected payments, ordered by date</div>
      </div>

      {/* DB error banner */}
      {dbError && (
        <div style={{
          background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)',
          borderRadius: 10, padding: '14px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 2 }}>Unable to load payment data</div>
            <div style={{ fontSize: 12, color: 'var(--text4)' }}>The database could not be reached. Please try refreshing the page.</div>
          </div>
        </div>
      )}

      {/* Total collected KPI box */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '16px 22px', marginBottom: 20, display: 'inline-flex', flexDirection: 'column', minWidth: 200,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>
          Total Collected
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-mono)', letterSpacing: '-.5px' }}>
          ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4 }}>{payments.length} payment{payments.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Empty state */}
      {payments.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text4)' }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ display: 'block', margin: '0 auto 14px', color: 'var(--text4)' }}>
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>No payments recorded yet</div>
          <div style={{ fontSize: 12 }}>Collected payments will appear here</div>
        </div>
      )}

      {/* Payment rows */}
      {payments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {payments.map(p => {
            const mc = METHOD_CONFIG[p.method] ?? METHOD_CONFIG.card
            return (
              <div key={p.id} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 11,
                padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 14,
                transition: 'border-color .12s',
              }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.15)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')}
              >
                {/* Method icon badge */}
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: mc.bg, border: `1px solid ${mc.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={mc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={mc.icon}/>
                  </svg>
                </div>

                {/* Client + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.job?.client ?? 'Direct payment'}
                    </span>
                    {/* Method badge */}
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: mc.color,
                      background: mc.bg, border: `1px solid ${mc.border}`,
                      borderRadius: 20, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '.4px', flexShrink: 0,
                    }}>
                      {mc.label}
                    </span>
                    {/* Signed badge */}
                    {p.signature && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: 'var(--green)',
                        background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)',
                        borderRadius: 4, padding: '2px 7px', letterSpacing: '.4px', flexShrink: 0,
                      }}>
                        SIGNED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text4)' }}>
                    Collected by {p.collectedBy.name} · <span style={{ fontFamily: 'var(--font-mono)' }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
