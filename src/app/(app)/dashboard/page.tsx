import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { can } from '@/lib/permissions'
import { getTenantFilter } from '@/lib/tenant'
import Link from 'next/link'
import { RevenueBarChart, JobsDonutChart } from '@/components/charts/RevenueChart'

// ── Tiny stat card ────────────────────────────────────────────────────────────

function StatCard({ value, label, color, sub }: { value: string; label: string; color: string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-.5px', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '.2px' }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>{sub}</div>
      )}
    </div>
  )
}

// ── Alert pill ────────────────────────────────────────────────────────────────

function AlertPill({ icon, text, href, color }: { icon: string; text: string; href: string; color: string }) {
  return (
    <Link href={href} style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '7px 12px 7px 10px',
      background: `${color}12`,
      border: `1px solid ${color}28`,
      borderRadius: 20, textDecoration: 'none',
      fontSize: 12, fontWeight: 600, color,
      transition: 'background 140ms',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      {text}
      <span style={{ fontSize: 11, opacity: .7 }}>→</span>
    </Link>
  )
}

// ── Onboarding step ───────────────────────────────────────────────────────────

function OnboardingStep({ done, index, label, sub, href, cta }: {
  done: boolean; index: number; label: string; sub: string; href: string | null; cta: string | null
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px',
      background: done ? 'rgba(34,197,94,.05)' : 'var(--bg3)',
      borderRadius: 12,
      border: `1px solid ${done ? 'rgba(34,197,94,.15)' : 'var(--border)'}`,
      transition: 'all 200ms',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: done ? 'var(--green)' : 'var(--bg4)',
        border: `2px solid ${done ? 'var(--green)' : 'var(--border2)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: done ? 14 : 12, fontWeight: 800,
        color: done ? '#060a17' : 'var(--text4)',
      }}>
        {done ? '✓' : index}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: done ? 'var(--text4)' : 'var(--text)',
          textDecoration: done ? 'line-through' : 'none',
          textDecorationColor: 'var(--text4)',
          marginBottom: 2,
        }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text4)', lineHeight: 1.5 }}>{sub}</div>
      </div>
      {href && cta && !done && (
        <Link href={href} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
          {cta}
        </Link>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'superadmin' && !session.impersonating) redirect('/superadmin')
  if (!can(session.role, 'viewDashboard')) redirect('/jobs')

  const tenantFilter = getTenantFilter(session)

  const [jobs, invoices, contracts, equipment, users] = await Promise.all([
    prisma.job.findMany({
      where: { ...tenantFilter, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.findMany({ where: tenantFilter, orderBy: { createdAt: 'desc' } }),
    prisma.contract.findMany({ where: { active: true, ...tenantFilter }, orderBy: { nextDueDate: 'asc' } }),
    prisma.equipment.findMany({ where: tenantFilter }),
    prisma.user.findMany({ where: { active: true, ...tenantFilter }, select: { id: true } }),
  ])

  // ── Computed values ─────────────────────────────────────────────────────────

  const activeJobs    = jobs.filter(j => j.status !== 'done')
  const urgentJobs    = activeJobs.filter(j => j.priority === 'urgent')
  const openJobs      = activeJobs.filter(j => j.status === 'open')
  const inProgressJobs = activeJobs.filter(j => j.status === 'in_progress')

  const paidAmt       = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const outstanding   = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0)
  const overdueInv    = invoices.filter(i => i.status === 'overdue')
  const recentInvoices = invoices.slice(0, 6)
  const contractMRR   = contracts.reduce((s, c) => s + Math.round(c.pricePerVisit / (c.frequencyDays / 30)), 0)
  const pmAlerts      = equipment.filter(e => e.lastPMDaysAgo >= e.intervalDays)
  const contractsDue  = contracts.filter(c => {
    const days = Math.ceil((new Date(c.nextDueDate).getTime() - Date.now()) / 86400000)
    return days <= 14
  })

  const isNewWorkspace = jobs.length === 0 && invoices.length === 0 && users.length <= 1
  const hasAlerts      = overdueInv.length > 0 || pmAlerts.length > 0 || urgentJobs.length > 0

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // ── Chart data ──────────────────────────────────────────────────────────────

  const monthlyRevenue = (() => {
    const now = new Date()
    const months: { month: string; revenue: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleDateString('en-US', { month: 'short' })
      const revenue = invoices
        .filter(inv => {
          const c = new Date(inv.createdAt)
          return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth()
        })
        .reduce((s, inv) => s + inv.total, 0)
      months.push({ month: label, revenue: Math.round(revenue) })
    }
    return months
  })()

  const jobStatusData = [
    { status: 'open', count: jobs.filter(j => j.status === 'open').length, color: '#5ba3f5' },
    { status: 'scheduled', count: jobs.filter(j => j.status === 'scheduled').length, color: '#f59e0b' },
    { status: 'in_progress', count: jobs.filter(j => j.status === 'in_progress').length, color: '#a78bfa' },
    { status: 'done', count: jobs.filter(j => j.status === 'done').length, color: '#22c55e' },
  ].filter(d => d.count > 0)

  // ── Invoice status badge ────────────────────────────────────────────────────

  const INV_STATUS: Record<string, { color: string; bg: string }> = {
    draft:   { color: 'var(--text3)', bg: 'var(--bg4)' },
    sent:    { color: '#5ba3f5',      bg: 'var(--blue-dim)' },
    paid:    { color: 'var(--green)', bg: 'var(--green-dim)' },
    overdue: { color: 'var(--red)',   bg: 'var(--red-dim)' },
  }

  const JOB_PRIORITY: Record<string, string> = {
    low: 'var(--text4)', normal: '#5ba3f5', high: 'var(--amber)', urgent: 'var(--red)',
  }

  const JOB_STATUS: Record<string, { label: string; color: string }> = {
    open:        { label: 'Open',        color: '#5ba3f5' },
    scheduled:   { label: 'Scheduled',   color: 'var(--amber)' },
    in_progress: { label: 'In Progress', color: 'var(--purple)' },
    done:        { label: 'Done',        color: 'var(--green)' },
  }

  return (
    <div className="dashboard-page" style={{ padding: '24px 24px 48px', maxWidth: 1200 }}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.5px' }}>
            Dashboard
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 3, fontWeight: 500 }}>
            {today}{session.company ? ` · ${session.company}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/invoices" className="btn btn-secondary btn-sm hide-mobile">
            + Invoice
          </Link>
          <Link href="/jobs" className="btn btn-primary btn-sm" style={{ gap: 5 }}>
            <span>+</span> New Job
          </Link>
        </div>
      </div>

      {/* ── Onboarding card (new workspaces only) ───────────────────────── */}
      {isNewWorkspace && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,.06) 0%, rgba(91,163,245,.04) 100%)',
          border: '1px solid var(--amber-border)',
          borderRadius: 16, padding: '22px 24px', marginBottom: 24,
          animation: 'fadeIn .4s ease',
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 3 }}>
            Welcome to WorkForge 👋
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18, lineHeight: 1.6 }}>
            Your workspace is live. Follow these steps to get your field operations running.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <OnboardingStep done index={1}
              label="Create your workspace" sub={session.company || 'WorkForge'}
              href={null} cta={null}
            />
            <OnboardingStep done={users.length > 1} index={2}
              label="Invite your first team member"
              sub="Add dispatchers and technicians so they can receive and complete jobs"
              href="/team" cta="Go to Team →"
            />
            <OnboardingStep done={jobs.length > 0} index={3}
              label="Create your first work order"
              sub="Assign a job to a tech and track it from open to complete"
              href="/jobs" cta="Create a Job →"
            />
          </div>
        </div>
      )}

      {/* ── Attention pills ──────────────────────────────────────────────── */}
      {hasAlerts && (
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20,
          padding: '14px 16px',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', alignSelf: 'center', marginRight: 4 }}>
            Needs attention
          </div>
          {urgentJobs.length > 0 && (
            <AlertPill
              icon="🚨"
              text={`${urgentJobs.length} urgent job${urgentJobs.length > 1 ? 's' : ''}`}
              href="/jobs" color="var(--red)"
            />
          )}
          {overdueInv.length > 0 && (
            <AlertPill
              icon="💰"
              text={`${overdueInv.length} invoice${overdueInv.length > 1 ? 's' : ''} overdue`}
              href="/invoices" color="var(--red)"
            />
          )}
          {pmAlerts.length > 0 && (
            <AlertPill
              icon="🔧"
              text={`${pmAlerts.length} unit${pmAlerts.length > 1 ? 's' : ''} need PM`}
              href="/equipment" color="var(--amber)"
            />
          )}
        </div>
      )}

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      <div className="responsive-kpi-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20,
      }}>
        <StatCard
          value={String(activeJobs.length)}
          label="Active Jobs"
          color={activeJobs.length > 0 ? 'var(--blue-light)' : 'var(--text4)'}
          sub={activeJobs.length > 0
            ? `${inProgressJobs.length} in progress · ${openJobs.length} open`
            : 'No active jobs'}
        />
        <StatCard
          value={`$${paidAmt.toLocaleString()}`}
          label="Revenue Collected"
          color={paidAmt > 0 ? 'var(--green)' : 'var(--text4)'}
          sub={`${invoices.filter(i => i.status === 'paid').length} paid invoice${invoices.filter(i => i.status === 'paid').length !== 1 ? 's' : ''}`}
        />
        <StatCard
          value={`$${outstanding.toLocaleString()}`}
          label="Outstanding"
          color={overdueInv.length > 0 ? 'var(--red)' : outstanding > 0 ? 'var(--amber)' : 'var(--text4)'}
          sub={overdueInv.length > 0 ? `${overdueInv.length} overdue` : outstanding > 0 ? 'All current' : 'No open invoices'}
        />
        <StatCard
          value={contractMRR > 0 ? `$${contractMRR.toLocaleString()}/mo` : '—'}
          label="Contract MRR"
          color={contractMRR > 0 ? 'var(--purple)' : 'var(--text4)'}
          sub={contracts.length > 0 ? `${contracts.length} active contract${contracts.length !== 1 ? 's' : ''}` : 'No contracts yet'}
        />
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Revenue — Last 6 Months</div>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 14 }}>Total invoice value by month</div>
          <RevenueBarChart data={monthlyRevenue} />
        </div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Jobs by Status</div>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 16 }}>Current job breakdown</div>
          <JobsDonutChart data={jobStatusData} />
        </div>
      </div>

      {/* ── Main content grid ────────────────────────────────────────────── */}
      <div className="responsive-bottom-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* Active jobs panel */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
                Active Jobs
              </div>
              <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>
                {activeJobs.length} open · updated live
              </div>
            </div>
            <Link href="/jobs" style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>

          {activeJobs.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🔧</div>
              <div className="title">No active jobs</div>
              <div className="sub">Jobs you create will appear here</div>
            </div>
          ) : (
            <div style={{ padding: '4px 0' }}>
              {activeJobs.slice(0, 7).map(job => {
                const status = JOB_STATUS[job.status]
                const priColor = JOB_PRIORITY[job.priority] ?? 'var(--text4)'
                return (
                  <Link key={job.id} href="/jobs" style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', textDecoration: 'none',
                    borderLeft: `3px solid ${priColor}`,
                    marginLeft: -1,
                  }}
                    className="dashboard-row-link"
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.client}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.type} · {job.address.split(',')[0]}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                      background: `${status.color}15`, color: status.color,
                      border: `1px solid ${status.color}28`, flexShrink: 0,
                      textTransform: 'uppercase', letterSpacing: '.4px',
                    }}>
                      {status.label}
                    </div>
                  </Link>
                )
              })}
              {activeJobs.length > 7 && (
                <div style={{ padding: '10px 16px', textAlign: 'center' }}>
                  <Link href="/jobs" style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>
                    +{activeJobs.length - 7} more →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent invoices panel */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
                Invoices
              </div>
              <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>
                {invoices.length} total · ${outstanding.toLocaleString()} outstanding
              </div>
            </div>
            <Link href="/invoices" style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="empty-state">
              <div className="icon">💰</div>
              <div className="title">No invoices yet</div>
              <div className="sub">Create an invoice or complete a job</div>
            </div>
          ) : (
            <div style={{ padding: '4px 0' }}>
              {recentInvoices.map(inv => {
                const st = INV_STATUS[inv.status] ?? INV_STATUS.draft
                return (
                  <Link key={inv.id} href="/invoices" style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', textDecoration: 'none',
                  }}
                    className="dashboard-row-link"
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.client}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text4)' }}>{inv.number}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: st.color }}>${inv.total.toLocaleString()}</div>
                      <div style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                        background: st.bg, color: st.color,
                        textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 3,
                        display: 'inline-block',
                      }}>
                        {inv.status}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Upcoming contract visits ─────────────────────────────────────── */}
      {contractsDue.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
              Upcoming Contract Visits
            </div>
            <Link href="/contracts" style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 0 }}>
            {contractsDue.slice(0, 4).map(c => {
              const days = Math.ceil((new Date(c.nextDueDate).getTime() - Date.now()) / 86400000)
              const color = days <= 3 ? 'var(--red)' : days <= 7 ? 'var(--amber)' : 'var(--green)'
              return (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{c.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.client}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text4)' }}>Every {c.frequencyDays} days · {c.units} unit{c.units !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color, flexShrink: 0 }}>
                    {days <= 0 ? 'NOW' : `${days}d`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
