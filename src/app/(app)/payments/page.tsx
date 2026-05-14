import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { can } from '@/lib/permissions'

export default async function PaymentsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'viewFinancials')) redirect('/jobs')

  const payments = await prisma.payment.findMany({
    include: {
      collectedBy: { select: { name: true, initials: true } },
      job: { select: { client: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const total = payments.reduce((s, p) => s + p.amount, 0)

  const METHOD_ICON: Record<string, string> = { card: '💳', cash: '💵', check: '📝', digital: '📱' }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Payment Ledger</h1>
        <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700, marginLeft: 'auto' }}>${total.toLocaleString()} collected</span>
      </div>

      {payments.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text4)' }}>No payments recorded yet</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {payments.map(p => (
          <div key={p.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 20 }}>{METHOD_ICON[p.method] ?? '💳'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p.job?.client ?? 'Direct payment'}</div>
              <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 1 }}>
                {p.method.charAt(0).toUpperCase() + p.method.slice(1)} · Collected by {p.collectedBy.name} · {new Date(p.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>${p.amount.toLocaleString()}</div>
            {p.signature && <span style={{ fontSize: 10, color: 'var(--text4)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px' }}>✓ Signed</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
