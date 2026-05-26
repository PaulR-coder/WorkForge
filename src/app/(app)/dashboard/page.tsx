import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { can } from '@/lib/permissions'
import { getTenantFilter } from '@/lib/tenant'
import Link from 'next/link'
import { RevenueBarChart } from '@/components/charts/RevenueChart'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmtTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 11, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function KpiCard({ value, label, sub, color, href }: { value: string; label: string; sub?: string; color: string; href?: string }) {
  const inner = (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 4,
      transition: 'border-color 150ms',
    }}>
      <div style={{ fontSize: 30, fontWeight: 900, color, letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text4)', lineHeight: 1.4 }}>{sub}</div>}
    </div>
  )
  if (href) return <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link>
  return inner
}

function AlertCard({ icon, title, sub, href, accent }: { icon: string; title: string; sub: string; href: string; accent: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--bg2)', border: `1px solid var(--border)`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 12, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'background 140ms',
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: accent, lineHeight: 1.3 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{sub}</div>
        </div>
        <span style={{ color: 'var(--text4)', fontSize: 14, flexShrink: 0 }}>→</span>
      </div>
    </Link>
  )
}

function TodayJobCard({ job }: { job: { id: string; client: string; type: string; scheduledAt: Date | null; status: string; priority: string; tech: { name: string; initials: string } | null } }) {
  const PRIORITY_COLOR: Record<string, string> = { low: '#94a3b8', normal: '#5ba3f5', high: '#f59e0b', urgent: '#ef4444' }
  const STATUS_LABEL: Record<string, string> = { open: 'Open', scheduled: 'Scheduled', in_progress: 'In Progress', done: 'Done' }
  const STATUS_COLOR: Record<string, string> = { open: '#5ba3f5', scheduled: '#f59e0b', in_progress: '#a78bfa', done: '#22c55e' }
  const priColor = PRIORITY_COLOR[job.priority] ?? '#94a3b8'
  const statusColor = STATUS_COLOR[job.status] ?? '#94a3b8'

  return (
    <Link href="/jobs" style={{ textDecoration: 'none', flex: '0 0 220px' }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
        padding: '16px 16px 14px', height: '100%', boxSizing: 'border-box',
        borderTop: `3px solid ${priColor}`,
      }}>
        {job.scheduledAt && (
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', marginBottom: 6 }}>
            {fmtTime(new Date(job.scheduledAt))}
          </div>
        )}
        {job.status === 'in_progress' && !job.scheduledAt && (
          <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 6 }}>In Progress</div>
        )}
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 3, lineHeight: 1.3 }}>
          {job.client}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 10 }}>{job.type}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {job.tech ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: 'var(--amber)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800, color: '#080c1a',
              }}>
                {job.tech.initials}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{job.tech.name.split(' ')[0]}</span>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>⚠ Unassigned</div>
          )}
          <div style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
            background: `${statusColor}18`, color: statusColor,
            textTransform: 'uppercase', letterSpacing: '.4px',
          }}>
            {STATUS_LABEL[job.status]}
          </div>
        </div>
      </div>
    </Link>
  )
}

function OnboardingStep({ done, index, label, sub, href, cta }: {
  done: boolean; index: number; label: string; sub: string; href: string | null; cta: string | null
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
      background: done ? 'rgba(34,197,94,.05)' : 'var(--bg3)',
      borderRadius: 12, border: `1px solid ${done ? 'rgba(34,197,94,.15)' : 'var(--border)'}`,
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
          fontSize: 13, fontWeight: 700, marginBottom: 2,
          color: done ? 'var(--text4)' : 'var(--text)',
          textDecoration: done ? 'line-through' : 'none',
          textDecorationColor: 'var(--text4)',
        }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text4)', lineHeight: 1.5 }}>{sub}</div>
      </div>
      {href && cta && !done && (
        <Link href={href} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>{cta}</Link>
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

  // "Today" window
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const [jobs, invoices, contracts, equipment, users, todayJobs, pendingEstimates, recentAudit] = await Promise.all([
    prisma.job.findMany({
      where: { ...tenantFilter, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.findMany({ where: tenantFilter, orderBy: { createdAt: 'desc' } }),
    prisma.contract.findMany({ where: { active: true, ...tenantFilter }, orderBy: { nextDueDate: 'asc' } }),
    prisma.equipment.findMany({ where: tenantFilter }),
    prisma.user.findMany({ where: { active: true, ...tenantFilter }, select: { id: true } }),
    // Jobs happening today (scheduled today OR currently in progress)
    prisma.job.findMany({
      where: {
        ...tenantFilter,
        archivedAt: null,
        OR: [
          { scheduledAt: { gte: startOfToday, lt: endOfToday } },
          { status: 'in_progress' },
        ],
      },
      include: { tech: { select: { name: true, initials: true } } },
      orderBy: { scheduledAt: 'asc' },
      take: 6,
    }),
    prisma.estimate.count({ where: { ...tenantFilter, status: 'sent' } }),
    prisma.auditLog.findMany({
      where: tenantFilter,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { icon: true, action: true, detail: true, createdAt: true },
    }),
  ])

  // ── Computed ────────────────────────────────────────────────────────────────

  const activeJobs      = jobs.filter(j => j.status !== 'done')
  const inProgressJobs  = activeJobs.filter(j => j.status === 'in_progress')
  const openJobs        = activeJobs.filter(j => j.status === 'open')
  const urgentJobs      = activeJobs.filter(j => j.priority === 'urgent')
  const unassignedJobs  = openJobs.filter(j => !j.techId)
  const overdueInv      = invoices.filter(i => i.status === 'overdue')
  const outstanding     = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0)
  const paidAmt         = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const pmAlerts        = equipment.filter(e => e.lastPMDaysAgo >= e.intervalDays)
  const contractMRR     = contracts.reduce((s, c) => s + Math.round(c.pricePerVisit / (c.frequencyDays / 30)), 0)
  const contractsDue    = contracts.filter(c => Math.ceil((new Date(c.nextDueDate).getTime() - Date.now()) / 86400000) <= 14)
  const isNewWorkspace  = jobs.length === 0 && invoices.length === 0 && users.length <= 1
  const recentInvoices  = invoices.slice(0, 5)

  const hour      = now.getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = session.name?.split(' ')[0] ?? 'there'
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Chart data
  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      revenue: Math.round(
        invoices
          .filter(inv => { const c = new Date(inv.createdAt); return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth() })
          .reduce((s, inv) => s + inv.total, 0)
      ),
    }
  })

  const jobTypeBreakdown = Object.entries(
    jobs.reduce<Record<string, number>>((acc, j) => {
      if (!j.type) return acc
      acc[j.type] = (acc[j.type] ?? 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])

  const maxTypeCount = jobTypeBreakdown[0]?.[1] ?? 1

  const JOB_PRIORITY: Record<string, string> = { low: 'var(--text4)', normal: '#5ba3f5', high: 'var(--amber)', urgent: 'var(--red)' }
  const JOB_STATUS: Record<string, { label: string; color: string }> = {
    open:        { label: 'Open',        color: '#5ba3f5' },
    scheduled:   { label: 'Scheduled',   color: 'var(--amber)' },
    in_progress: { label: 'In Progress', color: 'var(--purple)' },
    done:        { label: 'Done',        color: 'var(--green)' },
  }
  const INV_STATUS: Record<string, { color: string; bg: string }> = {
    draft:   { color: 'var(--text3)', bg: 'var(--bg4)' },
    sent:    { color: '#5ba3f5',      bg: 'var(--blue-dim)' },
    paid:    { color: 'var(--green)', bg: 'var(--green-dim)' },
    overdue: { color: 'var(--red)',   bg: 'var(--red-dim)' },
  }

  return (
    <>
    <style>{`
      @media (max-width: 767px) {
        .dash-desktop { display: none !important; }
        .dash-mobile  { display: block !important; }
      }
      @media (min-width: 768px) {
        .dash-desktop { display: block; }
        .dash-mobile  { display: none !important; }
      }
    `}</style>
    <div className="dash-mobile" style={{ padding: '16px 16px 24px' }}>

      {/* ── Mobile Header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0, letterSpacing: '-0.5px' }}>
          {greeting}, {firstName} 👋
        </h1>
        <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 4, fontWeight: 500 }}>
          {dateLabel}
        </div>
      </div>

      {/* ── KPI Chips 2×2 ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <Link href="/jobs" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 14px' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#5ba3f5', letterSpacing: '-1px', lineHeight: 1 }}>{activeJobs.length}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginTop: 4 }}>Active Jobs</div>
          </div>
        </Link>
        <Link href="/invoices?status=paid" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 14px' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--green)', letterSpacing: '-1px', lineHeight: 1 }}>${paidAmt.toLocaleString()}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginTop: 4 }}>Total Paid</div>
          </div>
        </Link>
        <Link href="/jobs" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 14px' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: urgentJobs.length > 0 ? 'var(--red)' : 'var(--text4)', letterSpacing: '-1px', lineHeight: 1 }}>{urgentJobs.length}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginTop: 4 }}>Urgent Jobs</div>
          </div>
        </Link>
        <Link href="/invoices?status=outstanding" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 14px' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: outstanding > 0 ? 'var(--amber)' : 'var(--text4)', letterSpacing: '-1px', lineHeight: 1 }}>${outstanding.toLocaleString()}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginTop: 4 }}>Outstanding</div>
          </div>
        </Link>
      </div>

      {/* ── Needs Attention strip ─────────────────────────────────────────── */}
      {(urgentJobs.length > 0 || overdueInv.length > 0 || unassignedJobs.length > 0 || pmAlerts.length > 0 || pendingEstimates > 0) && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Needs Attention
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {urgentJobs.length > 0 && (
              <AlertCard icon="🚨" accent="var(--red)"
                title={`${urgentJobs.length} urgent job${urgentJobs.length > 1 ? 's' : ''}`}
                sub="Require immediate attention" href="/jobs"
              />
            )}
            {overdueInv.length > 0 && (
              <AlertCard icon="💰" accent="var(--red)"
                title={`${overdueInv.length} overdue invoice${overdueInv.length > 1 ? 's' : ''}`}
                sub={`$${overdueInv.reduce((s, i) => s + i.total, 0).toLocaleString()} at risk`}
                href="/invoices"
              />
            )}
            {unassignedJobs.length > 0 && (
              <AlertCard icon="👤" accent="var(--amber)"
                title={`${unassignedJobs.length} job${unassignedJobs.length > 1 ? 's' : ''} without a tech`}
                sub="Assign a technician to get them moving" href="/jobs"
              />
            )}
            {pendingEstimates > 0 && (
              <AlertCard icon="📝" accent="#5ba3f5"
                title={`${pendingEstimates} estimate${pendingEstimates > 1 ? 's' : ''} awaiting response`}
                sub="Client hasn't approved or declined yet" href="/estimates"
              />
            )}
            {pmAlerts.length > 0 && (
              <AlertCard icon="🔧" accent="var(--amber)"
                title={`${pmAlerts.length} unit${pmAlerts.length > 1 ? 's' : ''} need preventive maintenance`}
                sub="PM is overdue — schedule service soon" href="/equipment"
              />
            )}
          </div>
        </div>
      )}

      {/* ── Today's Jobs ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Today's Jobs
        </div>
        {todayJobs.length === 0 ? (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📅</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>Nothing scheduled for today</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayJobs.slice(0, 6).map(job => (
              <div
                key={job.id}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '12px 14px', marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 2 }}>
                  {job.scheduledAt ? new Date(job.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Unscheduled'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                  {job.client}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{job.type}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── New Job button ────────────────────────────────────────────────── */}
      <Link href="/jobs" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
        + New Job
      </Link>

    </div>
    <div className="dash-desktop">
    <div style={{ padding: '28px 24px 60px', maxWidth: 1200 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', margin: 0, letterSpacing: '-0.5px' }}>
              {greeting}, {firstName} 👋
            </h1>
            <div style={{ fontSize: 13, color: 'var(--text4)', marginTop: 4, fontWeight: 500 }}>
              {dateLabel}{session.company ? ` · ${session.company}` : ''}
            </div>
          </div>
          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/estimates" className="btn btn-secondary btn-sm">📝 New Estimate</Link>
            <Link href="/invoices"  className="btn btn-secondary btn-sm hide-mobile">💰 New Invoice</Link>
            <Link href="/jobs"      className="btn btn-primary btn-sm">🔧 New Job</Link>
          </div>
        </div>
      </div>

      {/* ── Onboarding (new workspaces only) ───────────────────────────────── */}
      {isNewWorkspace && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,.06) 0%, rgba(91,163,245,.04) 100%)',
          border: '1px solid var(--amber-border)', borderRadius: 16,
          padding: '22px 24px', marginBottom: 32,
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 3 }}>
            Welcome to WorkForge 👋
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18, lineHeight: 1.6 }}>
            Your workspace is live. Follow these steps to get up and running.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <OnboardingStep done index={1} label="Create your workspace" sub={session.company || 'WorkForge'} href={null} cta={null} />
            <OnboardingStep done={users.length > 1} index={2} label="Invite your first team member" sub="Add dispatchers and technicians so they can receive and complete jobs" href="/team" cta="Go to Team →" />
            <OnboardingStep done={jobs.length > 0} index={3} label="Create your first work order" sub="Assign a job to a tech and track it from open to complete" href="/jobs" cta="Create a Job →" />
          </div>
        </div>
      )}

      {/* ── Needs attention ─────────────────────────────────────────────────── */}
      {(urgentJobs.length > 0 || overdueInv.length > 0 || unassignedJobs.length > 0 || pmAlerts.length > 0 || pendingEstimates > 0) && (
        <Section title="Needs Attention">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {urgentJobs.length > 0 && (
              <AlertCard icon="🚨" accent="var(--red)"
                title={`${urgentJobs.length} urgent job${urgentJobs.length > 1 ? 's' : ''}`}
                sub="Require immediate attention" href="/jobs"
              />
            )}
            {overdueInv.length > 0 && (
              <AlertCard icon="💰" accent="var(--red)"
                title={`${overdueInv.length} overdue invoice${overdueInv.length > 1 ? 's' : ''}`}
                sub={`$${overdueInv.reduce((s, i) => s + i.total, 0).toLocaleString()} at risk`}
                href="/invoices"
              />
            )}
            {unassignedJobs.length > 0 && (
              <AlertCard icon="👤" accent="var(--amber)"
                title={`${unassignedJobs.length} job${unassignedJobs.length > 1 ? 's' : ''} without a tech`}
                sub="Assign a technician to get them moving" href="/jobs"
              />
            )}
            {pendingEstimates > 0 && (
              <AlertCard icon="📝" accent="#5ba3f5"
                title={`${pendingEstimates} estimate${pendingEstimates > 1 ? 's' : ''} awaiting response`}
                sub="Client hasn't approved or declined yet" href="/estimates"
              />
            )}
            {pmAlerts.length > 0 && (
              <AlertCard icon="🔧" accent="var(--amber)"
                title={`${pmAlerts.length} unit${pmAlerts.length > 1 ? 's' : ''} need preventive maintenance`}
                sub="PM is overdue — schedule service soon" href="/equipment"
              />
            )}
          </div>
        </Section>
      )}

      {/* ── Today ───────────────────────────────────────────────────────────── */}
      <Section
        title={`Today · ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`}
        action={<Link href="/schedule" style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>Full schedule →</Link>}
      >
        {todayJobs.length === 0 ? (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
            padding: '28px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>Nothing scheduled for today</div>
            <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 16 }}>
              {activeJobs.length > 0
                ? `You have ${activeJobs.length} active job${activeJobs.length > 1 ? 's' : ''} — schedule them to see them here`
                : 'Create a job and schedule it to start your day'}
            </div>
            <Link href="/schedule" className="btn btn-secondary btn-sm">Open Schedule →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {todayJobs.map(job => (
              <TodayJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </Section>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <Section title="This Month">
        {/* Revenue split card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
            <Link href="/invoices?status=paid" style={{ textDecoration: 'none' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--green)', letterSpacing: '-1px', lineHeight: 1 }}>${paidAmt.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--text4)', fontWeight: 600, marginTop: 3 }}>Collected ↗</div>
            </Link>
            <Link href="/invoices?status=outstanding" style={{ textDecoration: 'none' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: outstanding > 0 ? 'var(--amber)' : 'var(--text4)', letterSpacing: '-1px', lineHeight: 1 }}>${outstanding.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--text4)', fontWeight: 600, marginTop: 3 }}>Outstanding ↗</div>
            </Link>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1 }}>${(paidAmt + outstanding).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--text4)', fontWeight: 600, marginTop: 3 }}>Total Invoiced</div>
            </div>
          </div>
          {(paidAmt + outstanding) > 0 && (
            <>
              <div style={{ height: 8, background: 'var(--bg4)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${Math.round((paidAmt / (paidAmt + outstanding)) * 100)}%`,
                  background: 'var(--green)',
                }} />
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text4)', fontWeight: 600 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                  Paid ({Math.round((paidAmt / (paidAmt + outstanding)) * 100)}%)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text4)', fontWeight: 600 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }} />
                  Outstanding ({Math.round((outstanding / (paidAmt + outstanding)) * 100)}%)
                </div>
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <KpiCard
            href="/jobs"
            value={String(activeJobs.length)}
            label="Active Jobs"
            color={activeJobs.length > 0 ? '#5ba3f5' : 'var(--text4)'}
            sub={activeJobs.length > 0 ? `${inProgressJobs.length} in progress · ${openJobs.length} open` : 'All clear'}
          />
          <KpiCard
            href="/contracts"
            value={contractMRR > 0 ? `$${contractMRR.toLocaleString()}` : '—'}
            label="Contract MRR"
            color={contractMRR > 0 ? 'var(--purple)' : 'var(--text4)'}
            sub={contracts.length > 0 ? `${contracts.length} active contract${contracts.length !== 1 ? 's' : ''}` : 'No contracts yet'}
          />
        </div>
      </Section>

      {/* ── Jobs + Invoices ─────────────────────────────────────────────────── */}
      <Section
        title="Active Jobs"
        action={<Link href="/jobs" style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>View all →</Link>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Active jobs */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {activeJobs.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🔧</div>
                <div className="title">No active jobs</div>
                <div className="sub">Jobs you create will appear here</div>
              </div>
            ) : (
              <>
                {activeJobs.slice(0, 7).map(job => {
                  const status = JOB_STATUS[job.status]
                  const priColor = JOB_PRIORITY[job.priority] ?? 'var(--text4)'
                  return (
                    <Link key={job.id} href="/jobs" className="dashboard-row-link" style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 16px', textDecoration: 'none',
                      borderLeft: `3px solid ${priColor}`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {job.client}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {job.type}
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
              </>
            )}
          </div>

          {/* Recent invoices */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 11px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: 1 }}>Recent Invoices</div>
              <Link href="/invoices" style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>View all →</Link>
            </div>
            {recentInvoices.length === 0 ? (
              <div className="empty-state">
                <div className="icon">💰</div>
                <div className="title">No invoices yet</div>
                <div className="sub">Complete a job to create your first invoice</div>
              </div>
            ) : (
              recentInvoices.map(inv => {
                const st = INV_STATUS[inv.status] ?? INV_STATUS.draft
                return (
                  <Link key={inv.id} href="/invoices" className="dashboard-row-link" style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 16px', textDecoration: 'none',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.client}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text4)' }}>{inv.number}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: st.color }}>${inv.total.toLocaleString()}</div>
                      <div style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                        background: st.bg, color: st.color, marginTop: 3, display: 'inline-block',
                        textTransform: 'uppercase', letterSpacing: '.4px',
                      }}>
                        {inv.status}
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </Section>

      {/* ── Recent activity ──────────────────────────────────────────────────── */}
      {recentAudit.length > 0 && (
        <Section title="Recent Activity">
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {recentAudit.map((entry, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                borderBottom: i < recentAudit.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: 'center' }}>{entry.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{entry.action}</span>
                  {entry.detail && (
                    <span style={{ fontSize: 12, color: 'var(--text4)', marginLeft: 6 }}>— {entry.detail}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text4)', flexShrink: 0 }}>
                  {timeAgo(new Date(entry.createdAt))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Insights (charts) ────────────────────────────────────────────────── */}
      <Section title="Insights">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>Revenue — Last 6 Months</div>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 14 }}>Total invoice value by month</div>
            <RevenueBarChart data={monthlyRevenue} />
          </div>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>Jobs by Status</div>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 16 }}>Current breakdown</div>
            {/* Clickable status breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { status: 'open',        label: 'Open',        color: '#5ba3f5', count: jobs.filter(j => j.status === 'open').length },
                { status: 'scheduled',   label: 'Scheduled',   color: 'var(--amber)', count: jobs.filter(j => j.status === 'scheduled').length },
                { status: 'in_progress', label: 'In Progress', color: 'var(--purple)', count: jobs.filter(j => j.status === 'in_progress').length },
                { status: 'done',        label: 'Done',        color: 'var(--green)', count: jobs.filter(j => j.status === 'done').length },
              ].map(({ status, label, color, count }) => (
                <Link key={status} href={`/jobs?status=${status}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
                    padding: '16px 18px',
                  }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{count}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{label}</div>
                  </div>
                </Link>
              ))}
            </div>
            {jobTypeBreakdown.length > 0 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>Jobs by Trade Type</div>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 14 }}>Click a type to filter the jobs board</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {jobTypeBreakdown.slice(0, 6).map(([type, count]) => (
                    <Link key={type} href={`/jobs?type=${encodeURIComponent(type)}`} style={{ textDecoration: 'none', display: 'block' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{type}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)' }}>{count} job{count !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--bg4)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 99, background: '#5ba3f5',
                          width: `${Math.round((count / maxTypeCount) * 100)}%`,
                        }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ── Upcoming contract visits ─────────────────────────────────────────── */}
      {contractsDue.length > 0 && (
        <Section
          title="Upcoming Contract Visits"
          action={<Link href="/contracts" style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>View all →</Link>}
        >
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {contractsDue.slice(0, 4).map(c => {
                const days = Math.ceil((new Date(c.nextDueDate).getTime() - Date.now()) / 86400000)
                const color = days <= 3 ? 'var(--red)' : days <= 7 ? 'var(--amber)' : 'var(--green)'
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{c.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.client}</div>
                      <div style={{ fontSize: 11, color: 'var(--text4)' }}>Every {c.frequencyDays} days · {c.units} unit{c.units !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900, color, flexShrink: 0 }}>{days <= 0 ? 'NOW' : `${days}d`}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </Section>
      )}

    </div>
    </div>
    </>
  )
}
