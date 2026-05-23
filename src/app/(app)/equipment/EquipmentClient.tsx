'use client'

import { useState } from 'react'

type Equipment = {
  id: string; client: string; name: string; brand: string; model: string
  serialNumber: string; icon: string; intervalDays: number; lastPMDaysAgo: number
  totalServices: number; warrantyEnd: string | null; notes: string
  lat?: number | null; lng?: number | null
}

function pmStatus(eq: Equipment) {
  const remain = eq.intervalDays - eq.lastPMDaysAgo
  if (remain <= 0) return { label: 'Overdue', color: 'var(--red)', dim: 'var(--red-dim)' }
  if (remain <= 14) return { label: 'Due Soon', color: 'var(--amber)', dim: 'var(--amber-dim)' }
  return { label: 'OK', color: 'var(--green)', dim: 'var(--green-dim)' }
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text)', fontSize: 13, padding: '9px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)',
  textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4,
}

const noteInp: React.CSSProperties = {
  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text)', fontSize: 12, padding: '8px 10px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

function GearIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 12px', display: 'block' }}>
      <path d="M24 30a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M38.4 30a2 2 0 0 0 .4 2.2l.14.14a2.4 2.4 0 0 1-1.7 4.12 2.4 2.4 0 0 1-1.7-.7l-.14-.14a2 2 0 0 0-2.2-.4 2 2 0 0 0-1.2 1.82v.4a2.4 2.4 0 0 1-4.8 0v-.22a2 2 0 0 0-1.32-1.82 2 2 0 0 0-2.2.4l-.14.14a2.4 2.4 0 0 1-3.4-3.4l.14-.14a2 2 0 0 0 .4-2.2 2 2 0 0 0-1.82-1.2h-.4a2.4 2.4 0 0 1 0-4.8h.22a2 2 0 0 0 1.82-1.32 2 2 0 0 0-.4-2.2l-.14-.14a2.4 2.4 0 0 1 3.4-3.4l.14.14a2 2 0 0 0 2.2.4h.1a2 2 0 0 0 1.2-1.82v-.4a2.4 2.4 0 0 1 4.8 0v.22a2 2 0 0 0 1.2 1.82 2 2 0 0 0 2.2-.4l.14-.14a2.4 2.4 0 0 1 3.4 3.4l-.14.14a2 2 0 0 0-.4 2.2v.1a2 2 0 0 0 1.82 1.2h.4a2.4 2.4 0 0 1 0 4.8h-.22a2 2 0 0 0-1.82 1.2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
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
  const [locatingEquipment, setLocatingEquipment] = useState<{ id: string; name: string; client: string; lat?: number | null } | null>(null)
  const [locForm, setLocForm] = useState({ lat: '', lng: '' })
  const [locLoading, setLocLoading] = useState(false)

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
    <div style={{ padding: '24px 20px', maxWidth: 860, margin: '0 auto' }}>
      <style>{`
        /* Equipment stats grid: 2x2 on mobile */
        @media (max-width: 639px) {
          .wf-mobile-stats-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        /* Equipment action footer: ensure 44px touch targets */
        @media (max-width: 639px) {
          .wf-mobile-eq-footer button {
            min-height: 44px;
          }
        }
        /* Add equipment modal: single column on mobile */
        @media (max-width: 639px) {
          .wf-mobile-eq-modal-2col {
            grid-template-columns: 1fr !important;
          }
        }
        /* Modal: full width on mobile */
        @media (max-width: 639px) {
          .wf-mobile-eq-modal-box {
            max-width: 100% !important;
            border-radius: 16px 16px 0 0 !important;
            max-height: 92vh;
          }
          .wf-mobile-eq-modal-wrap {
            align-items: flex-end !important;
            padding: 0 !important;
          }
        }
      `}</style>
      {/* Page Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '.5px', lineHeight: 1.1, margin: 0 }}>
            Equipment & PM Tracking
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 5 }}>
            {equipment.length} unit{equipment.length !== 1 ? 's' : ''} across {clients.length} client{clients.length !== 1 ? 's' : ''}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setCreateOpen(true)}
            style={{
              padding: '9px 18px', background: 'var(--amber)', color: '#080c1a',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', flexShrink: 0, fontFamily: 'var(--font-body)',
              letterSpacing: '.2px',
            }}
          >
            + Add Equipment
          </button>
        )}
      </div>

      {/* Empty State */}
      {equipment.length === 0 && !createOpen && (
        <div style={{ textAlign: 'center', padding: '72px 20px', color: 'var(--text4)' }}>
          <div style={{ color: 'var(--text4)', opacity: 0.4 }}>
            <GearIcon />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text3)', marginBottom: 6 }}>No equipment tracked yet</div>
          <div style={{ fontSize: 12, maxWidth: 280, margin: '0 auto' }}>Equipment is added from the Jobs board when a job is linked to a unit.</div>
        </div>
      )}

      {/* Client Groups */}
      {clients.map(client => (
        <div key={client} style={{ marginBottom: 28 }}>
          {/* Client Group Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
            paddingLeft: 12, borderLeft: '3px solid var(--amber)',
          }}>
            <span style={{
              fontSize: 13, fontWeight: 700, color: 'var(--text)',
              fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '.8px',
            }}>
              {client}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text4)', fontWeight: 500 }}>
              {equipment.filter(e => e.client === client).length} unit{equipment.filter(e => e.client === client).length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {equipment.filter(e => e.client === client).map(eq => {
              const st = pmStatus(eq)
              const remain = eq.intervalDays - eq.lastPMDaysAgo
              const pct = Math.max(0, Math.min(100, Math.round((1 - eq.lastPMDaysAgo / eq.intervalDays) * 100)))
              const busy = loadingId === eq.id

              return (
                <div key={eq.id} style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 14, overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(0,0,0,.25)',
                }}>
                  {/* Card Body */}
                  <div style={{ padding: '16px 18px' }}>
                    {/* Header Row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                      <div style={{
                        fontSize: 22, width: 44, height: 44, borderRadius: 10,
                        background: 'var(--bg4)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)',
                      }}>
                        {eq.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{eq.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 3 }}>
                          {eq.brand} {eq.model}
                          {eq.serialNumber && <span style={{ opacity: 0.7 }}> &middot; S/N {eq.serialNumber}</span>}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                        background: st.dim, color: st.color, border: `1px solid ${st.color}33`,
                        flexShrink: 0, fontFamily: 'var(--font-mono)', letterSpacing: '.4px',
                      }}>
                        {st.label}
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="wf-mobile-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
                      {[
                        { n: eq.totalServices.toString(), l: 'Total Services', color: undefined },
                        { n: `${eq.lastPMDaysAgo}d`, l: 'Since Last PM', color: undefined },
                        {
                          n: remain <= 0 ? 'NOW' : `${remain}d`,
                          l: remain <= 0 ? 'PM Overdue' : 'Until PM Due',
                          color: st.color,
                        },
                        {
                          n: eq.warrantyEnd ? new Date(eq.warrantyEnd).getFullYear().toString() : 'N/A',
                          l: 'Warranty',
                          color: undefined,
                        },
                      ].map((s, i) => (
                        <div key={i} style={{
                          textAlign: 'center', background: 'var(--bg3)',
                          borderRadius: 10, padding: '10px 6px',
                          border: '1px solid var(--border)',
                        }}>
                          <div style={{
                            fontSize: 18, fontWeight: 800,
                            color: s.color ?? 'var(--text)',
                            fontFamily: 'var(--font-mono)', lineHeight: 1,
                            marginBottom: 4,
                          }}>
                            {s.n}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text4)', lineHeight: 1.2 }}>{s.l}</div>
                        </div>
                      ))}
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: eq.notes || editingId === eq.id ? 14 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text4)', marginBottom: 5 }}>
                        <span>PM Interval Health</span>
                        <span style={{ color: st.color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{pct}% remaining</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: st.color, borderRadius: 10,
                          transition: 'width .4s ease',
                        }} />
                      </div>
                    </div>

                    {/* Notes */}
                    {editingId === eq.id ? (
                      <div>
                        <textarea
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          rows={2}
                          placeholder="Notes…"
                          style={{ ...noteInp, resize: 'vertical', marginBottom: 8 }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => saveNotes(eq.id)}
                            disabled={busy}
                            style={{ padding: '6px 16px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}
                          >
                            {busy ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{ padding: '6px 14px', background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 11, cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      eq.notes && (
                        <div style={{
                          fontSize: 11, color: 'var(--text3)', fontStyle: 'italic',
                          background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px',
                          border: '1px solid var(--border)', lineHeight: 1.5,
                        }}>
                          {eq.notes}
                        </div>
                      )
                    )}
                  </div>

                  {/* Confirm Delete Panel */}
                  {confirmDelete === eq.id && (
                    <div style={{
                      background: 'rgba(239,68,68,.08)', borderTop: '1px solid rgba(239,68,68,.2)',
                      padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, flex: 1 }}>
                        Delete this equipment permanently?
                      </span>
                      <button
                        onClick={() => deleteEquipment(eq.id)}
                        disabled={busy}
                        style={{ padding: '6px 14px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        style={{ padding: '6px 12px', background: 'transparent', color: 'var(--text4)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 11, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Action Footer */}
                  {canEdit && editingId !== eq.id && confirmDelete !== eq.id && (
                    <div className="wf-mobile-eq-footer" style={{
                      display: 'flex', gap: 6, borderTop: '1px solid var(--border)',
                      padding: '12px 18px', background: 'var(--bg3)',
                    }}>
                      <button
                        onClick={() => logPM(eq)}
                        disabled={busy}
                        style={{
                          padding: '7px 16px', background: 'var(--green)', color: '#fff',
                          border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700,
                          cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
                        }}
                      >
                        {busy ? 'Logging…' : '✓ Log PM'}
                      </button>
                      <button
                        onClick={() => { setEditingId(eq.id); setEditNotes(eq.notes) }}
                        style={{
                          padding: '7px 14px', background: 'transparent', color: 'var(--text3)',
                          border: '1px solid var(--border)', borderRadius: 7, fontSize: 11, cursor: 'pointer',
                        }}
                      >
                        Edit Notes
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocatingEquipment(eq)}
                        style={{
                          padding: '5px 12px', background: 'var(--bg4)', border: '1px solid var(--border)',
                          borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text3)',
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}
                      >
                        📍 {eq.lat ? 'Update Location' : 'Mark Location'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(eq.id)}
                        style={{
                          marginLeft: 'auto', padding: '7px 12px', background: 'transparent',
                          color: 'var(--red)', border: '1px solid rgba(239,68,68,.25)',
                          borderRadius: 7, fontSize: 11, cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Mark Location Modal */}
      {locatingEquipment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,10,23,.7)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg2)', borderRadius: 16, padding: '24px', width: '100%', maxWidth: 400, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Mark Equipment Location</div>
            <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 20 }}>{locatingEquipment.name}</div>

            <button
              type="button"
              onClick={() => {
                if (!navigator.geolocation) return
                navigator.geolocation.getCurrentPosition(pos => {
                  setLocForm(f => ({ ...f, lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) }))
                })
              }}
              style={{ width: '100%', padding: '10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 12 }}
            >
              📍 Use My Current Location
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', display: 'block', marginBottom: 4 }}>Latitude</label>
                <input
                  value={locForm.lat}
                  onChange={e => setLocForm(f => ({ ...f, lat: e.target.value }))}
                  placeholder="e.g. 25.7617"
                  style={{ width: '100%', padding: '8px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)', boxSizing: 'border-box' as const }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', display: 'block', marginBottom: 4 }}>Longitude</label>
                <input
                  value={locForm.lng}
                  onChange={e => setLocForm(f => ({ ...f, lng: e.target.value }))}
                  placeholder="e.g. -80.1918"
                  style={{ width: '100%', padding: '8px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)', boxSizing: 'border-box' as const }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => { setLocatingEquipment(null); setLocForm({ lat: '', lng: '' }) }} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>Cancel</button>
              <button
                type="button"
                disabled={locLoading || !locForm.lat || !locForm.lng}
                onClick={async () => {
                  const lat = parseFloat(locForm.lat)
                  const lng = parseFloat(locForm.lng)
                  if (isNaN(lat) || isNaN(lng)) return
                  setLocLoading(true)
                  try {
                    const res = await fetch(`/api/equipment/${locatingEquipment.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ lat, lng, locatedAt: new Date().toISOString() }),
                    })
                    if (!res.ok) throw new Error('Failed')
                    const updated = await res.json()
                    setEquipment(prev => prev.map(e => e.id === locatingEquipment.id ? { ...e, lat: updated.lat, lng: updated.lng } : e))
                    setLocatingEquipment(null)
                    setLocForm({ lat: '', lng: '' })
                  } catch {
                    // error visible via res.ok check
                  } finally {
                    setLocLoading(false)
                  }
                }}
                className="btn btn-primary"
                style={{ flex: 2, opacity: (!locForm.lat || !locForm.lng) ? 0.5 : 1 }}
              >
                {locLoading ? 'Saving…' : 'Save Location'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Equipment Modal */}
      {createOpen && (
        <div
          className="wf-mobile-eq-modal-wrap"
          onClick={e => { if (e.target === e.currentTarget) { setCreateOpen(false); resetCreateForm() } }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div className="wf-mobile-eq-modal-box" style={{
            background: 'var(--bg2)', borderRadius: 16, width: '100%',
            maxWidth: 'min(520px,92vw)', overflowY: 'auto', maxHeight: '92vh',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)',
            borderTop: '3px solid var(--amber)',
          }}>
            <div style={{ padding: '22px 24px 0' }}>
              <div style={{
                fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4,
                fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '.5px',
              }}>
                Add Equipment
              </div>
              <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 22 }}>
                Track a new unit for PM scheduling
              </div>
            </div>

            <div style={{ padding: '0 24px 24px' }}>
              {/* Row: Icon + Client */}
              <div className="wf-mobile-eq-modal-2col" style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Icon</label>
                  <input value={createIcon} onChange={e => setCreateIcon(e.target.value)} placeholder="⚙" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Client *</label>
                  <input value={createClient} onChange={e => setCreateClient(e.target.value)} placeholder="Client name" autoFocus style={inp} />
                </div>
              </div>

              {/* Equipment Name */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Equipment Name *</label>
                <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="e.g. Rooftop HVAC Unit" style={inp} />
              </div>

              {/* Row: Brand + Model */}
              <div className="wf-mobile-eq-modal-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Brand</label>
                  <input value={createBrand} onChange={e => setCreateBrand(e.target.value)} placeholder="e.g. Carrier" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Model</label>
                  <input value={createModel} onChange={e => setCreateModel(e.target.value)} placeholder="e.g. 48XP" style={inp} />
                </div>
              </div>

              {/* Row: Serial + PM Interval */}
              <div className="wf-mobile-eq-modal-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Serial Number</label>
                  <input value={createSerial} onChange={e => setCreateSerial(e.target.value)} placeholder="S/N" style={inp} />
                </div>
                <div>
                  <label style={lbl}>PM Interval (days)</label>
                  <input type="number" min={1} value={createIntervalDays} onChange={e => setCreateIntervalDays(Number(e.target.value))} style={inp} />
                </div>
              </div>

              {/* Row: Installed + Warranty */}
              <div className="wf-mobile-eq-modal-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Installed At</label>
                  <input type="date" value={createInstalledAt} onChange={e => setCreateInstalledAt(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Warranty End</label>
                  <input type="date" value={createWarrantyEnd} onChange={e => setCreateWarrantyEnd(e.target.value)} style={inp} />
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Notes</label>
                <textarea
                  value={createNotes}
                  onChange={e => setCreateNotes(e.target.value)}
                  rows={3}
                  placeholder="Any additional notes…"
                  style={{ ...inp, resize: 'vertical' as const }}
                />
              </div>

              {createError && (
                <div style={{
                  marginBottom: 14, fontSize: 12, color: 'var(--red)', fontWeight: 600,
                  background: 'rgba(239,68,68,.08)', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid rgba(239,68,68,.2)',
                }}>
                  {createError}
                </div>
              )}

              <button
                onClick={submitCreate}
                disabled={createLoading}
                style={{
                  width: '100%', padding: '12px 0', background: 'var(--amber)', color: '#080c1a',
                  border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700,
                  cursor: createLoading ? 'wait' : 'pointer', opacity: createLoading ? 0.7 : 1, marginBottom: 8,
                }}
              >
                {createLoading ? 'Saving…' : 'Add Equipment'}
              </button>
              <button
                onClick={() => { setCreateOpen(false); resetCreateForm() }}
                style={{
                  width: '100%', padding: '10px 0', background: 'transparent',
                  color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
