'use client'

import { useState } from 'react'

type Equipment = {
  id: string; client: string; name: string; brand: string; model: string
  serialNumber: string; icon: string; intervalDays: number; lastPMDaysAgo: number
  totalServices: number; warrantyEnd: string | null; notes: string
}

function pmStatus(eq: Equipment) {
  const remain = eq.intervalDays - eq.lastPMDaysAgo
  if (remain <= 0) return { label: 'Overdue', color: 'var(--red)' }
  if (remain <= 14) return { label: 'Due Soon', color: 'var(--amber)' }
  return { label: 'OK', color: 'var(--green)' }
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text)', fontSize: 13, padding: '9px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)',
  textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4,
}

export default function EquipmentClient({
  initialEquipment,
  canEdit,
}: {
  initialEquipment: Equipment[]
  canEdit: boolean
}) {
  const [equipment, setEquipment] = useState(initialEquipment)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false)
  const [createIcon, setCreateIcon] = useState('⚙')
  const [createClient, setCreateClient] = useState('')
  const [createName, setCreateName] = useState('')
  const [createBrand, setCreateBrand] = useState('')
  const [createModel, setCreateModel] = useState('')
  const [createSerial, setCreateSerial] = useState('')
  const [createInstalledAt, setCreateInstalledAt] = useState('')
  const [createWarrantyEnd, setCreateWarrantyEnd] = useState('')
  const [createIntervalDays, setCreateIntervalDays] = useState(90)
  const [createNotes, setCreateNotes] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  function resetCreateForm() {
    setCreateIcon('⚙')
    setCreateClient('')
    setCreateName('')
    setCreateBrand('')
    setCreateModel('')
    setCreateSerial('')
    setCreateInstalledAt('')
    setCreateWarrantyEnd('')
    setCreateIntervalDays(90)
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
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icon: createIcon,
          client: createClient.trim(),
          name: createName.trim(),
          brand: createBrand.trim(),
          model: createModel.trim(),
          serialNumber: createSerial.trim(),
          installedAt: createInstalledAt || undefined,
          warrantyEnd: createWarrantyEnd || undefined,
          intervalDays: createIntervalDays,
          notes: createNotes.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setCreateError(err.error ?? 'Failed to create equipment.')
        return
      }
      const created = await res.json()
      const normalized: Equipment = {
        ...created,
        warrantyEnd: created.warrantyEnd ? new Date(created.warrantyEnd).toISOString() : null,
      }
      setEquipment(prev => [normalized, ...prev])
      setCreateOpen(false)
      resetCreateForm()
    } finally {
      setCreateLoading(false)
    }
  }

  const noteInp: React.CSSProperties = {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text)', fontSize: 12, padding: '8px 10px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  const clients = [...new Set(equipment.map(e => e.client))]

  async function logPM(eq: Equipment) {
    setLoadingId(eq.id)
    const res = await fetch(`/api/equipment/${eq.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lastPMDaysAgo: 0, totalServices: eq.totalServices + 1 }),
    })
    setLoadingId(null)
    if (res.ok) {
      const updated = await res.json()
      setEquipment(prev => prev.map(e => e.id === eq.id ? { ...e, ...updated } : e))
    }
  }

  async function saveNotes(id: string) {
    setLoadingId(id)
    const res = await fetch(`/api/equipment/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: editNotes }),
    })
    setLoadingId(null)
    if (res.ok) {
      setEquipment(prev => prev.map(e => e.id === id ? { ...e, notes: editNotes } : e))
    }
    setEditingId(null)
  }

  async function deleteEquipment(id: string) {
    setLoadingId(id)
    const res = await fetch(`/api/equipment/${id}`, { method: 'DELETE' })
    setLoadingId(null)
    if (res.ok) setEquipment(prev => prev.filter(e => e.id !== id))
    setConfirmDelete(null)
  }

  return (
    <div className="page-padding" style={{ padding: 20 }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Equipment & PM Tracking</h1>
          <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>
            {equipment.length} units across {clients.length} client{clients.length !== 1 ? 's' : ''}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setCreateOpen(true)}
            style={{ padding: '7px 14px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            + Add Equipment
          </button>
        )}
      </div>

      {equipment.length === 0 && !createOpen && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text4)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⚙️</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No equipment tracked yet</div>
          <div style={{ fontSize: 12 }}>Equipment is added from the Jobs board when a job is linked to a unit.</div>
        </div>
      )}

      {clients.map(client => (
        <div key={client} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>
            {client} — {equipment.filter(e => e.client === client).length} units
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {equipment.filter(e => e.client === client).map(eq => {
              const st = pmStatus(eq)
              const remain = eq.intervalDays - eq.lastPMDaysAgo
              const pct = Math.max(0, Math.min(100, Math.round((1 - eq.lastPMDaysAgo / eq.intervalDays) * 100)))
              const busy = loadingId === eq.id

              return (
                <div key={eq.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 22, width: 40, height: 40, borderRadius: 10, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{eq.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{eq.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{eq.brand} {eq.model} · S/N: {eq.serialNumber}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: `${st.color}18`, color: st.color, border: `1px solid ${st.color}33`, flexShrink: 0 }}>{st.label}</span>
                  </div>

                  <div className="equipment-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
                    {[
                      { n: eq.totalServices, l: 'Total services' },
                      { n: `${eq.lastPMDaysAgo}d`, l: 'Since last PM' },
                      { n: remain <= 0 ? 'NOW' : `${remain}d`, l: remain <= 0 ? 'PM overdue' : 'Until PM due', color: st.color },
                      { n: eq.warrantyEnd ? new Date(eq.warrantyEnd).getFullYear().toString() : 'N/A', l: 'Warranty' },
                    ].map((s, i) => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: (s as { color?: string }).color ?? 'var(--text)' }}>{s.n}</div>
                        <div style={{ fontSize: 10, color: 'var(--text4)' }}>{s.l}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text4)', marginBottom: 3 }}>
                      <span>PM interval health</span><span>{pct}% remaining</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: st.color, borderRadius: 10 }} />
                    </div>
                  </div>

                  {editingId === eq.id ? (
                    <div style={{ marginBottom: 8 }}>
                      <textarea
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        rows={2}
                        placeholder="Notes…"
                        style={{ ...noteInp, resize: 'vertical', marginBottom: 6 }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => saveNotes(eq.id)} disabled={busy}
                          style={{ padding: '6px 14px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                          {busy ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          style={{ padding: '6px 14px', background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 11, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    eq.notes && <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', marginBottom: 8 }}>{eq.notes}</div>
                  )}

                  {canEdit && editingId !== eq.id && (
                    <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 2 }}>
                      <button onClick={() => logPM(eq)} disabled={busy}
                        style={{ padding: '6px 14px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                        {busy ? 'Logging…' : '✓ Log PM'}
                      </button>
                      <button onClick={() => { setEditingId(eq.id); setEditNotes(eq.notes) }}
                        style={{ padding: '6px 14px', background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 11, cursor: 'pointer' }}>
                        Edit Notes
                      </button>
                      {confirmDelete === eq.id ? (
                        <>
                          <button onClick={() => deleteEquipment(eq.id)} disabled={busy}
                            style={{ padding: '6px 12px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            Confirm Delete
                          </button>
                          <button onClick={() => setConfirmDelete(null)}
                            style={{ padding: '6px 12px', background: 'transparent', color: 'var(--text4)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 11, cursor: 'pointer' }}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelete(eq.id)}
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
      ))}

      {/* Add Equipment Modal */}
      {createOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setCreateOpen(false); resetCreateForm() } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 'min(480px,90vw)', padding: 24, overflowY: 'auto', maxHeight: '90vh' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 20 }}>Add Equipment</div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Icon (emoji)</label>
              <input
                value={createIcon}
                onChange={e => setCreateIcon(e.target.value)}
                placeholder="⚙"
                style={inp}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Client</label>
              <input
                value={createClient}
                onChange={e => setCreateClient(e.target.value)}
                placeholder="Client name"
                style={inp}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Equipment Name</label>
              <input
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                placeholder="e.g. Rooftop HVAC Unit"
                style={inp}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Brand</label>
              <input
                value={createBrand}
                onChange={e => setCreateBrand(e.target.value)}
                placeholder="e.g. Carrier"
                style={inp}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Model</label>
              <input
                value={createModel}
                onChange={e => setCreateModel(e.target.value)}
                placeholder="e.g. 48XP"
                style={inp}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Serial Number</label>
              <input
                value={createSerial}
                onChange={e => setCreateSerial(e.target.value)}
                placeholder="S/N"
                style={inp}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Installed At</label>
              <input
                type="date"
                value={createInstalledAt}
                onChange={e => setCreateInstalledAt(e.target.value)}
                style={inp}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Warranty End (optional)</label>
              <input
                type="date"
                value={createWarrantyEnd}
                onChange={e => setCreateWarrantyEnd(e.target.value)}
                style={inp}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>PM Interval (days)</label>
              <input
                type="number"
                min={1}
                value={createIntervalDays}
                onChange={e => setCreateIntervalDays(Number(e.target.value))}
                style={inp}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Notes</label>
              <textarea
                value={createNotes}
                onChange={e => setCreateNotes(e.target.value)}
                rows={3}
                placeholder="Any additional notes…"
                style={{ ...inp, resize: 'vertical' }}
              />
            </div>

            {createError && (
              <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>{createError}</div>
            )}

            <button
              onClick={submitCreate}
              disabled={createLoading}
              style={{ width: '100%', padding: '11px 0', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: createLoading ? 'wait' : 'pointer', opacity: createLoading ? 0.7 : 1, marginBottom: 8 }}
            >
              {createLoading ? 'Saving…' : 'Add Equipment'}
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
    </div>
  )
}
