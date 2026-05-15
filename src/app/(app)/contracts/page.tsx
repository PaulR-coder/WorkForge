import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getTenantFilter } from '@/lib/tenant'

export default async function ContractsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const tenantFilter = getTenantFilter(session)
  const contracts = await prisma.contract.findMany({ where: tenantFilter, orderBy: { nextDueDate: 'asc' } })
  const totalMRR = contracts.filter(c => c.active).reduce((s, c) => s + Math.round(c.pricePerVisit / (c.frequencyDays / 30)), 0)

  return (
    <div className="page-padding" style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Service Contracts</h1>
        <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>MRR: <strong style={{ color: 'var(--green)' }}>${totalMRR.toLocaleString()}/month</strong> · {contracts.filter(c => c.active).length} active</div>
      </div>

      <div className="responsive-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { n: `$${totalMRR.toLocaleString()}`, l: 'Monthly Contract Revenue', c: 'var(--green)' },
          { n: contracts.reduce((s, c) => s + c.jobsCompleted, 0).toString(), l: 'Jobs Completed', c: 'var(--text)' },
          { n: '98%', l: 'Contract Retention', c: 'var(--blue-light)' },
          { n: contracts.filter(c => Math.ceil((new Date(c.nextDueDate).getTime() - Date.now()) / 86400000) <= 14).length.toString(), l: 'Due This Week', c: 'var(--amber)' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.c }}>{kpi.n}</div>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4 }}>{kpi.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {contracts.map(c => {
          const days = Math.ceil((new Date(c.nextDueDate).getTime() - Date.now()) / 86400000)
          const urgColor = days <= 7 ? 'var(--red)' : days <= 14 ? 'var(--amber)' : 'var(--green)'
          const mrr = Math.round(c.pricePerVisit / (c.frequencyDays / 30))
          return (
            <div key={c.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 22, width: 42, height: 42, borderRadius: 10, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{c.client} · {c.units} units · Every {c.frequencyDays} days · {c.techInitials || 'TBD'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--purple)' }}>${c.pricePerVisit.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--text4)' }}>per visit · ${mrr.toLocaleString()}/mo MRR</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
                {[
                  { n: days <= 0 ? 'NOW' : `${days}d`, l: 'Until next job', c: urgColor },
                  { n: c.jobsCompleted.toString(), l: 'Jobs completed' },
                  { n: c.active ? '●' : '○', l: 'Status', c: c.active ? 'var(--green)' : 'var(--text4)' },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', background: 'var(--bg3)', borderRadius: 8, padding: '8px 0' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: (s as {c?: string}).c ?? 'var(--text)' }}>{s.n}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)' }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {c.notes && <div style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 7, padding: '7px 10px' }}>{c.notes}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
