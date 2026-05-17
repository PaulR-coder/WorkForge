import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { can } from '@/lib/permissions'
import { getTenantFilter } from '@/lib/tenant'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'viewDashboard')) redirect('/jobs')

  const tenantFilter = getTenantFilter(session)
  const [jobs, invoices, contracts, equipment, users] = await Promise.all([
    prisma.job.findMany({ where: tenantFilter, orderBy: { createdAt: 'desc' } }),
    prisma.invoice.findMany({ where: tenantFilter, orderBy: { createdAt: 'desc' } }),
    prisma.contract.findMany({ where: { active: true, ...tenantFilter } }),
    prisma.equipment.findMany({ where: tenantFilter }),
    prisma.user.findMany({ where: { active: true, ...tenantFilter }, select: { id: true } }),
  ])

  const paidAmt = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length
  const doneJobs = jobs.filter(j => j.status === 'done').length
  const contractMRR = contracts.reduce((s, c) => s + Math.round(c.pricePerVisit / (c.frequencyDays / 30)), 0)
  const pmAlerts = equipment.filter(e => e.lastPMDaysAgo >= e.intervalDays).length

  const isNewWorkspace = jobs.length === 0 && invoices.length === 0 && users.length <= 1
  const hasTeam = users.length > 1
  const hasJobs = jobs.length > 0

  const onboardingSteps = [
    {
      done: true,
      label: 'Create your workspace',
      sub: session.company || 'WorkForge',
      href: null,
      cta: null,
    },
    {
      done: hasTeam,
      label: 'Invite your first team member',
      sub: 'Add dispatchers and technicians so they can receive and complete jobs',
      href: '/team',
      cta: 'Go to Team →',
    },
    {
      done: hasJobs,
      label: 'Create your first work order',
      sub: 'Assign a job to a tech and track it from open to complete',
      href: '/jobs',
      cta: 'Create a Job →',
    },
  ]

  return (
    <div className="dashboard-page" style={{ padding: 20, maxWidth: 1200 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Dashboard</h1>
        <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>
          {session.company || 'WorkForge'} · Real-time overview
        </div>
      </div>

      {/* Onboarding card — shown until workspace has jobs + team */}
      {isNewWorkspace && (
        <div style={{ background: 'rgba(245,158,11,.05)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 14, padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
            👋 Welcome to WorkForge!
          </div>
          <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 18 }}>
            Your workspace is ready. Complete these steps to start managing your field operations.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {onboardingSteps.map((step, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px',
                background: step.done ? 'rgba(34,197,94,.06)' : 'var(--bg3)',
                borderRadius: 10,
                border: `1px solid ${step.done ? 'rgba(34,197,94,.15)' : 'var(--border)'}`,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: step.done ? 'var(--green)' : 'var(--bg5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: step.done ? 14 : 12, fontWeight: 800,
                  color: step.done ? '#fff' : 'var(--text4)',
                }}>
                  {step.done ? '✓' : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: step.done ? 'var(--text4)' : 'var(--text)',
                    textDecoration: step.done ? 'line-through' : 'none',
                    marginBottom: 2,
                  }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text4)' }}>{step.sub}</div>
                </div>
                {step.href && !step.done && (
                  <Link href={step.href} style={{
                    padding: '8px 14px', background: 'var(--amber)', color: '#080c1a',
                    borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: 'none',
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}>
                    {step.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {overdueCount > 0 && (
        <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span>⚠</span>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>
            {overdueCount} invoice{overdueCount > 1 ? 's' : ''} overdue — ${invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0).toLocaleString()} outstanding
          </span>
          <a href="/invoices" style={{ fontSize: 11, color: 'var(--red)', textDecoration: 'none', fontWeight: 700 }}>View →</a>
        </div>
      )}
      {pmAlerts > 0 && (
        <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span>🔧</span>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>
            {pmAlerts} equipment unit{pmAlerts > 1 ? 's' : ''} need preventive maintenance
          </span>
          <a href="/equipment" style={{ fontSize: 11, color: 'var(--amber)', textDecoration: 'none', fontWeight: 700 }}>View →</a>
        </div>
      )}
      {contractMRR > 0 && (
        <div style={{ background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span>📑</span>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>
            Contract MRR: <strong style={{ color: 'var(--green)' }}>${contractMRR.toLocaleString()}/month</strong> — {contracts.length} active contract{contracts.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* KPI Grid */}
      <div className="responsive-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          {
            n: `$${paidAmt.toLocaleString()}`,
            label: 'Revenue Collected',
            sub: invoices.filter(i => i.status === 'paid').length > 0
              ? `From ${invoices.filter(i => i.status === 'paid').length} paid invoice${invoices.filter(i => i.status === 'paid').length !== 1 ? 's' : ''}`
              : 'No payments collected yet',
            color: paidAmt > 0 ? 'var(--green)' : 'var(--text4)',
          },
          {
            n: `$${outstanding.toLocaleString()}`,
            label: 'Outstanding',
            sub: overdueCount > 0 ? `${overdueCount} overdue` : outstanding > 0 ? 'All current' : 'No open invoices',
            color: overdueCount > 0 ? 'var(--red)' : outstanding > 0 ? 'var(--amber)' : 'var(--text4)',
          },
          {
            n: String(doneJobs),
            label: 'Jobs Completed',
            sub: jobs.length > 0 ? `${jobs.filter(j => j.status === 'open').length} open` : 'No jobs created yet',
            color: doneJobs > 0 ? 'var(--text)' : 'var(--text4)',
          },
          {
            n: `$${contractMRR.toLocaleString()}`,
            label: 'Contract MRR',
            sub: contracts.length > 0 ? `${contracts.length} active contract${contracts.length !== 1 ? 's' : ''}` : 'No contracts yet',
            color: contractMRR > 0 ? 'var(--purple)' : 'var(--text4)',
          },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color, marginBottom: 4 }}>{kpi.n}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 10, color: 'var(--text4)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="responsive-bottom-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Upcoming Contract Jobs</div>
          {contracts.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📑</div>
              <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.6 }}>
                No contracts yet.{' '}
                <Link href="/contracts" style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 700 }}>
                  Add a service contract
                </Link>{' '}
                to automatically generate recurring jobs.
              </div>
            </div>
          ) : (
            contracts.slice(0, 4).map(c => {
              const days = Math.ceil((new Date(c.nextDueDate).getTime() - Date.now()) / 86400000)
              const color = days <= 7 ? 'var(--red)' : days <= 14 ? 'var(--amber)' : 'var(--green)'
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 14 }}>{c.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{c.client}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)' }}>Every {c.frequencyDays} days</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color }}>{days <= 0 ? 'NOW' : `${days}d`}</div>
                </div>
              )
            })
          )}
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Recent Invoices</div>
          {invoices.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>💰</div>
              <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.6 }}>
                No invoices yet.{' '}
                <Link href="/invoices" style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 700 }}>
                  Create your first invoice
                </Link>{' '}
                or complete a job to bill automatically.
              </div>
            </div>
          ) : (
            invoices.slice(0, 5).map(inv => {
              const colors: Record<string, string> = { draft: 'var(--text3)', sent: '#5ba3f5', paid: 'var(--green)', overdue: 'var(--red)' }
              const c = colors[inv.status] ?? 'var(--text)'
              return (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{inv.client}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)' }}>{inv.number}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: c }}>${inv.total.toLocaleString()}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: c }}>{inv.status}</div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
