import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { can } from '@/lib/permissions'
import { getTenantFilter } from '@/lib/tenant'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'viewDashboard')) redirect('/jobs')

  const tenantFilter = getTenantFilter(session)
  const [jobs, invoices, contracts, equipment] = await Promise.all([
    prisma.job.findMany({ where: tenantFilter, orderBy: { createdAt: 'desc' } }),
    prisma.invoice.findMany({ where: tenantFilter, orderBy: { createdAt: 'desc' } }),
    prisma.contract.findMany({ where: { active: true, ...tenantFilter } }),
    prisma.equipment.findMany({ where: tenantFilter }),
  ])

  const paidAmt = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length
  const doneJobs = jobs.filter(j => j.status === 'done').length
  const contractMRR = contracts.reduce((s, c) => s + Math.round(c.pricePerVisit / (c.frequencyDays / 30)), 0)
  const pmAlerts = equipment.filter(e => e.lastPMDaysAgo >= e.intervalDays).length

  return (
    <div className="dashboard-page" style={{ padding: 20, maxWidth: 1200 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Owner Dashboard</h1>
        <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>Real-time business intelligence</div>
      </div>

      {/* Alerts */}
      {overdueCount > 0 && (
        <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span>⚠</span>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>{overdueCount} invoice{overdueCount > 1 ? 's' : ''} overdue — ${invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0).toLocaleString()} outstanding</span>
          <a href="/invoices" style={{ fontSize: 11, color: 'var(--red)', textDecoration: 'none', fontWeight: 700 }}>View →</a>
        </div>
      )}
      {pmAlerts > 0 && (
        <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span>🔧</span>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>{pmAlerts} equipment unit{pmAlerts > 1 ? 's' : ''} need preventive maintenance</span>
          <a href="/equipment" style={{ fontSize: 11, color: 'var(--amber)', textDecoration: 'none', fontWeight: 700 }}>View →</a>
        </div>
      )}
      <div style={{ background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span>📑</span>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Contract MRR: <strong style={{ color: 'var(--green)' }}>${contractMRR.toLocaleString()}/month</strong> — {contracts.length} active contracts</span>
      </div>

      {/* KPI Grid */}
      <div className="responsive-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { n: `$${paidAmt.toLocaleString()}`, label: 'Revenue Collected', sub: `From ${invoices.filter(i => i.status === 'paid').length} paid invoices`, color: 'var(--green)' },
          { n: `$${outstanding.toLocaleString()}`, label: 'Outstanding', sub: overdueCount ? `${overdueCount} overdue` : 'All current', color: overdueCount ? 'var(--red)' : 'var(--amber)' },
          { n: String(doneJobs), label: 'Jobs Completed', sub: `${jobs.filter(j => j.status === 'open').length} open`, color: 'var(--text)' },
          { n: `$${contractMRR.toLocaleString()}`, label: 'Contract MRR', sub: `${contracts.length} active contracts`, color: 'var(--purple)' },
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
          {contracts.slice(0, 4).map(c => {
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
          })}
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Recent Invoices</div>
          {invoices.slice(0, 5).map(inv => {
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
          })}
        </div>
      </div>
    </div>
  )
}
