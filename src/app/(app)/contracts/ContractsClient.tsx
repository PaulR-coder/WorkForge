'use client'

import { useState } from 'react'

type Contract = {
  id: string; client: string; name: string; icon: string; units: number
  techInitials: string; frequencyDays: number; pricePerVisit: number
  nextDueDate: string; jobsCompleted: number; active: boolean; notes: string
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text)', fontSize: 13, padding: '9px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)',
  textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4,
}

function todayPlusDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
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

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false)
  const [createIcon, setCreateIcon] = useState('📑')
  const [createClient, setCreateClient] = useState('')
  const [createName, setCreateName] = useState('')
  const [createUnits, setCreateUnits] = useState(1)
  const [createTechInitials, setCreateTechInitials] = useState('')
  const [createFrequencyDays, setCreateFrequencyDays] = useState(90)
  const [createPricePerVisit, setCreatePricePerVisit] = useState(0)
  const [createNextDueDate, setCreateNextDueDate] = useState(() => todayPlusDays(30))
  const [createNotes, setCreateNotes] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  // Edit modal state
  const [editContract, setEditContract] = useState<Contract | null>(null)
  const [editIcon, setEditIcon] = useState('')
  const [editClient, setEditClient] = useState('')
  const [editName, setEditName] = useState('')
  const [editUnits, setEditUnits] = useState(1)
  const [editTechInitials, setEditTechInitials] = useState('')
  const [editFrequencyDays, setEditFrequencyDays] = useState(90)
  const [editPricePerVisit, setEditPricePerVisit] = useState(0)
  const [editNextDueDate, setEditNextDueDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  function openEdit(c: Contract) {
    setEditContract(c)
    setEditIcon(c.icon)
    setEditClient(c.client)
    setEditName(c.name)
    setEditUnits(c.units)
    setEditTechInitials(c.techInitials)
    setEditFrequencyDays(c.frequencyDays)
    setEditPricePerVisit(c.pricePerVisit)
    setEditNextDueDate(c.nextDueDate ? new Date(c.nextDueDate).toISOString().slice(0, 10) : todayPlusDays(30))
    setEditNotes(c.notes)
    setEditError('')
  }

  function resetCreateForm() {
    setCreateIcon('📑')
    setCreateClient('')
    setCreateName('')
    setCreateUnits(1)
    setCreateTechInitials('')
    setCreateFrequencyDays(90)
    setCreatePricePerVisit(0)
    setCreateNextDueDate(todayPlusDays(30))
    setCreateNotes('')
    setCreateError('')
  }

  async function submitCreate() {
    if (!createClient.trim() || !createName.trim()) {
      setCreateError('Client and Name are required.')
      return
    }
    setCreateLoading(true)
    setCreateError('')
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icon: createIcon,
          client: createClient.trim(),
          name: createName.trim(),
          units: createUnits,
          techInitials: createTechInitials.trim(),
          frequencyDays: createFrequencyDays,
          pricePerVisit: createPricePerVisit,
          nextDueDate: createNextDueDate,
          notes: createNotes.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setCreateError(err.error ?? 'Failed to create contract.')
        return
      }
      const created = await res.json()
      setContracts(prev => [created, ...prev])
      setCreateOpen(false)
      resetCreateForm()
    } finally {
      setCreateLoading(false)
    }
  }

  async function submitEdit() {
    if (!editContract) return
    if (!editClient.trim() || !editName.trim()) {
      setEditError('Client and Name are required.')
      return
    }
    setEditLoading(true)
    setEditError('')
    try {
      const res = await fetch(`/api/contracts/${editContract.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icon: editIcon,
          client: editClient.trim(),
          name: editName.trim(),
          units: editUnits,
          techInitials: editTechInitials.trim(),
          frequencyDays: editFrequencyDays,
          pricePerVisit: editPricePerVisit,
          nextDueDate: editNextDueDate,
          notes: editNotes.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setEditError(err.error ?? 'Failed to update contract.')
        return
      }
      const updated = await res.json()
      setContracts(prev => prev.map(c => c.id === editContract.id ? { ...c, ...updated } : c))
      setEditContract(null)
    } finally {
      setEditLoading(false)
    }
  }

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
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Service Contracts</h1>
          <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>
            MRR: <strong style={{ color: 'var(--green)' }}>${totalMRR.toLocaleString()}/month</strong> · {active.length} active
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setCreateOpen(true)}
            style={{ padding: '7px 14px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            + Add Contract
          </button>
        )}
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
                  <button onClick={() => openEdit(c)}
                    style={{ padding: '6px 14px', background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 11, cursor: 'pointer' }}>
                    Edit
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

      {/* Add Contract Modal */}
      {createOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setCreateOpen(false); resetCreateForm() } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 'min(480px,90vw)', padding: 24, overflowY: 'auto', maxHeight: '90vh' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 20 }}>Add Contract</div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Icon (emoji)</label><input value={createIcon} onChange={e => setCreateIcon(e.target.value)} placeholder="📑" style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Client</label><input value={createClient} onChange={e => setCreateClient(e.target.value)} placeholder="Client name" autoFocus style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Contract Name</label><input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="e.g. Annual HVAC Maintenance" style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Units</label><input type="number" min={1} value={createUnits} onChange={e => setCreateUnits(Number(e.target.value))} style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Tech Initials</label><input value={createTechInitials} onChange={e => setCreateTechInitials(e.target.value)} placeholder="e.g. CG" style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Frequency (days)</label><input type="number" min={1} value={createFrequencyDays} onChange={e => setCreateFrequencyDays(Number(e.target.value))} style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Price Per Visit $</label><input type="number" min={0} value={createPricePerVisit} onChange={e => setCreatePricePerVisit(Number(e.target.value))} style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Next Due Date</label><input type="date" value={createNextDueDate} onChange={e => setCreateNextDueDate(e.target.value)} style={inp} /></div>
            <div style={{ marginBottom: 20 }}><label style={lbl}>Notes</label><textarea value={createNotes} onChange={e => setCreateNotes(e.target.value)} rows={3} placeholder="Any notes…" style={{ ...inp, resize: 'vertical' as const }} /></div>
            {createError && (
              <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>{createError}</div>
            )}
            <button
              onClick={submitCreate}
              disabled={createLoading}
              style={{ width: '100%', padding: '11px 0', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: createLoading ? 'wait' : 'pointer', opacity: createLoading ? 0.7 : 1, marginBottom: 8 }}
            >
              {createLoading ? 'Saving…' : 'Add Contract'}
            </button>
            <button
              onClick={() => { setCreateOpen(false); resetCreateForm() }}
              style={{ width: '100%', padding: '9px 0', background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Contract Modal */}
      {editContract && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setEditContract(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 'min(480px,90vw)', padding: 24, overflowY: 'auto', maxHeight: '90vh' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 20 }}>Edit Contract</div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Icon (emoji)</label><input value={editIcon} onChange={e => setEditIcon(e.target.value)} placeholder="📑" style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Client</label><input value={editClient} onChange={e => setEditClient(e.target.value)} placeholder="Client name" autoFocus style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Contract Name</label><input value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. Annual HVAC Maintenance" style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Units</label><input type="number" min={1} value={editUnits} onChange={e => setEditUnits(Number(e.target.value))} style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Tech Initials</label><input value={editTechInitials} onChange={e => setEditTechInitials(e.target.value)} placeholder="e.g. CG" style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Frequency (days)</label><input type="number" min={1} value={editFrequencyDays} onChange={e => setEditFrequencyDays(Number(e.target.value))} style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Price Per Visit $</label><input type="number" min={0} value={editPricePerVisit} onChange={e => setEditPricePerVisit(Number(e.target.value))} style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Next Due Date</label><input type="date" value={editNextDueDate} onChange={e => setEditNextDueDate(e.target.value)} style={inp} /></div>
            <div style={{ marginBottom: 20 }}><label style={lbl}>Notes</label><textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} placeholder="Any notes…" style={{ ...inp, resize: 'vertical' as const }} /></div>
            {editError && (
              <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>{editError}</div>
            )}
            <button
              onClick={submitEdit}
              disabled={editLoading}
              style={{ width: '100%', padding: '11px 0', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: editLoading ? 'wait' : 'pointer', opacity: editLoading ? 0.7 : 1, marginBottom: 8 }}
            >
              {editLoading ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={() => setEditContract(null)}
              style={{ width: '100%', padding: '9px 0', background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
