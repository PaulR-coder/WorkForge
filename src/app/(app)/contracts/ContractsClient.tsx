'use client'

import { useState } from 'react'

type Contract = {
  id: string; client: string; name: string; icon: string; units: number
  techInitials: string; frequencyDays: number; pricePerVisit: number
  nextDueDate: string; jobsCompleted: number; active: boolean; notes: string
}

export default function ContractsClient({
  initialContracts,
  canEdit,
}: {
  initialContracts: Contract[]
  canEdit: boolean
}) {
  const [contracts, setContracts] = useState(initialContracts)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const active = contracts.filter(c => c.active)
  const totalMRR = active.reduce((s, c) => s + Math.round(c.pricePerVisit / (c.frequencyDays / 30)), 0)
  const dueSoon = contracts.filter(c => Math.ceil((new Date(c.nextDueDate).getTime() - Date.now()) / 86400000) <= 14).length

  async function toggleActive(c: Contract) {
    setLoadingId(c.id)
    const res = await fetch(`/api/contracts/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !c.active }),
    })
    setLoadingId(null)
    if (res.ok) {
      const updated = await res.json()
      setContracts(prev => prev.map(x => x.id === c.id ? { ...x, active: updated.active } : x))
    }
  }

  async function deleteContract(id: string) {
    setLoadingId(id)
    const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
    setLoadingId(null)
    if (res.ok) setContracts(prev => prev.filter(c => c.id !== id))
    setConfirmDelete(null)
  }

  return (
    <div className="page-padding" style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Service Contracts</h1>
        <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>
          MRR: <strong style={{ color: 'var(--green)' }}>${totalMRR.toLocaleString()}/month</strong> · {active.length} active
        </div>
      </div>

      <div className="responsive-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { n: `$${totalMRR.toLocaleString()}`, l: 'Monthly Contract Revenue', c: 'var(--green)' },
          { n: contracts.reduce((s, c) => s + c.jobsCompleted, 0).toString(), l: 'Jobs Completed', c: 'var(--text)' },
          { n: active.length.toString(), l: 'Active Contracts', c: 'var(--blue-light)' },
          { n: dueSoon.toString(), l: 'Due This Week', c: 'var(--amber)' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.c }}>{kpi.n}</div>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4 }}>{kpi.l}</div>
          </div>
        ))}
      </div>

      {contracts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text4)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📑</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No contracts yet</div>
          <div style={{ fontSize: 12 }}>Add service contracts to track recurring revenue and schedule visits automatically.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {contracts.map(c => {
          const days = Math.ceil((new Date(c.nextDueDate).getTime() - Date.now()) / 86400000)
          const urgColor = days <= 7 ? 'var(--red)' : days <= 14 ? 'var(--amber)' : 'var(--green)'
          const mrr = Math.round(c.pricePerVisit / (c.frequencyDays / 30))
          const busy = loadingId === c.id

          return (
            <div key={c.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, opacity: c.active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 22, width: 42, height: 42, borderRadius: 10, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{c.client} · {c.units} units · Every {c.frequencyDays} days · {c.techInitials || 'TBD'}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--purple)' }}>${c.pricePerVisit.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--text4)' }}>per visit · ${mrr.toLocaleString()}/mo MRR</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
                {[
                  { n: days <= 0 ? 'NOW' : `${days}d`, l: 'Until next job', c: urgColor },
                  { n: c.jobsCompleted.toString(), l: 'Jobs completed' },
                  { n: c.active ? 'Active' : 'Paused', l: 'Status', c: c.active ? 'var(--green)' : 'var(--text4)' },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', background: 'var(--bg3)', borderRadius: 8, padding: '8px 0' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: (s as { c?: string }).c ?? 'var(--text)' }}>{s.n}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)' }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {c.notes && <div style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 7, padding: '7px 10px', marginBottom: 10 }}>{c.notes}</div>}

              {canEdit && (
                <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <button onClick={() => toggleActive(c)} disabled={busy}
                    style={{ padding: '6px 14px', background: c.active ? 'var(--bg3)' : 'var(--green)', color: c.active ? 'var(--text3)' : '#fff', border: c.active ? '1px solid var(--border)' : 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                    {busy ? '…' : c.active ? 'Pause' : 'Activate'}
                  </button>
                  {confirmDelete === c.id ? (
                    <>
                      <button onClick={() => deleteContract(c.id)} disabled={busy}
                        style={{ padding: '6px 12px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Confirm Delete
                      </button>
                      <button onClick={() => setConfirmDelete(null)}
                        style={{ padding: '6px 12px', background: 'transparent', color: 'var(--text4)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 11, cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelete(c.id)}
                      style={{ marginLeft: 'auto', padding: '6px 12px', background: 'transparent', color: 'var(--red)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 7, fontSize: 11, cursor: 'pointer' }}>
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
