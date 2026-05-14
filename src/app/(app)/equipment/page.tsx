import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function EquipmentPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const equipment = await prisma.equipment.findMany({ orderBy: { client: 'asc' } })

  const clients = [...new Set(equipment.map(e => e.client))]

  function status(e: typeof equipment[0]) {
    const remain = e.intervalDays - e.lastPMDaysAgo
    if (remain <= 0) return { label: 'Overdue', color: 'var(--red)' }
    if (remain <= 14) return { label: 'Due Soon', color: 'var(--amber)' }
    return { label: 'OK', color: 'var(--green)' }
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Equipment & PM Tracking</h1>
        <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>{equipment.length} units across {clients.length} clients</div>
      </div>

      {clients.map(client => (
        <div key={client} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>
            {client} — {equipment.filter(e => e.client === client).length} units
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {equipment.filter(e => e.client === client).map(eq => {
              const st = status(eq)
              const remain = eq.intervalDays - eq.lastPMDaysAgo
              const pct = Math.max(0, Math.min(100, Math.round((1 - eq.lastPMDaysAgo / eq.intervalDays) * 100)))
              return (
                <div key={eq.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 22, width: 40, height: 40, borderRadius: 10, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{eq.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{eq.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{eq.brand} {eq.model} · S/N: {eq.serialNumber}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: `${st.color}18`, color: st.color, border: `1px solid ${st.color}33` }}>{st.label}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
                    {[
                      { n: eq.totalServices, l: 'Total services' },
                      { n: `${eq.lastPMDaysAgo}d`, l: 'Since last PM' },
                      { n: remain <= 0 ? 'NOW' : `${remain}d`, l: remain <= 0 ? 'PM overdue' : 'Until PM due', color: st.color },
                      { n: eq.warrantyEnd ? new Date(eq.warrantyEnd).getFullYear().toString() : 'N/A', l: 'Warranty' },
                    ].map((s, i) => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: (s as {color?: string}).color ?? 'var(--text)' }}>{s.n}</div>
                        <div style={{ fontSize: 10, color: 'var(--text4)' }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text4)', marginBottom: 3 }}>
                      <span>PM interval health</span><span>{pct}% remaining</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: st.color, borderRadius: 10 }} />
                    </div>
                  </div>
                  {eq.notes && <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>{eq.notes}</div>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
