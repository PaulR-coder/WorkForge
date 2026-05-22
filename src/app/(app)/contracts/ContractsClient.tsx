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

function DocumentIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 12px', display: 'block' }}>
      <rect x="10" y="6" width="28" height="36" rx="4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 16h16M16 22h16M16 28h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ContractModal({
  title,
  icon, setIcon,
  client, setClient,
  name, setName,
  units, setUnits,
  techInitials, setTechInitials,
  frequencyDays, setFrequencyDays,
  pricePerVisit, setPricePerVisit,
  nextDueDate, setNextDueDate,
  notes, setNotes,
  loading, error,
  onSubmit, onCancel,
  submitLabel,
}: {
  title: string
  icon: string; setIcon: (v: string) => void
  client: string; setClient: (v: string) => void
  name: string; setName: (v: string) => void
  units: number; setUnits: (v: number) => void
  techInitials: string; setTechInitials: (v: string) => void
  frequencyDays: number; setFrequencyDays: (v: number) => void
  pricePerVisit: number; setPricePerVisit: (v: number) => void
  nextDueDate: string; setNextDueDate: (v: string) => void
  notes: string; setNotes: (v: string) => void
  loading: boolean; error: string
  onSubmit: () => void; onCancel: () => void
  submitLabel: string
}) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{
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
            {title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 22 }}>
            All fields marked * are required
          </div>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          {/* Row: Icon + Client */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Icon</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="📑" style={inp} />
            </div>
            <div>
              <label style={lbl}>Client *</label>
              <input value={client} onChange={e => setClient(e.target.value)} placeholder="Client name" autoFocus style={inp} />
            </div>
          </div>

          {/* Contract Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Contract Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Annual HVAC Maintenance" style={inp} />
          </div>

          {/* Row: Units + Tech */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Units</label>
              <input type="number" min={1} value={units} onChange={e => setUnits(Number(e.target.value))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Tech Initials</label>
              <input value={techInitials} onChange={e => setTechInitials(e.target.value)} placeholder="e.g. CG" style={inp} />
            </div>
          </div>

          {/* Row: Frequency + Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Frequency (days)</label>
              <input type="number" min={1} value={frequencyDays} onChange={e => setFrequencyDays(Number(e.target.value))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Price Per Visit $</label>
              <input type="number" min={0} value={pricePerVisit} onChange={e => setPricePerVisit(Number(e.target.value))} style={inp} />
            </div>
          </div>

          {/* Next Due Date */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Next Due Date</label>
            <input type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} style={inp} />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any notes…" style={{ ...inp, resize: 'vertical' as const }} />
          </div>

          {error && (
            <div style={{
              marginBottom: 14, fontSize: 12, color: 'var(--red)', fontWeight: 600,
              background: 'rgba(239,68,68,.08)', padding: '8px 12px', borderRadius: 8,
              border: '1px solid rgba(239,68,68,.2)',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={onSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '12px 0', background: 'var(--amber)', color: '#080c1a',
              border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: 8,
            }}
          >
            {loading ? 'Saving…' : submitLabel}
          </button>
          <button
            onClick={onCancel}
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
  )
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
  const totalJobs = contracts.reduce((s, c) => s + c.jobsCompleted, 0)

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
    <div style={{ padding: '24px 20px', maxWidth: 860, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{
            fontSize: 26, fontWeight: 700, color: 'var(--text)',
            fontFamily: 'var(--font-display)', textTransform: 'uppercase',
            letterSpacing: '.5px', lineHeight: 1.1, margin: 0,
          }}>
            Service Contracts
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 5 }}>
            {contracts.length} contract{contracts.length !== 1 ? 's' : ''} &middot; {active.length} active
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
            + Add Contract
          </button>
        )}
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { n: `$${totalMRR.toLocaleString()}`, l: 'Monthly Revenue', c: 'var(--green)', accent: 'rgba(34,197,94,.15)' },
          { n: totalJobs.toString(), l: 'Jobs Completed', c: 'var(--text)', accent: 'transparent' },
          { n: active.length.toString(), l: 'Active Contracts', c: 'var(--blue-light)', accent: 'rgba(91,163,245,.12)' },
          { n: dueSoon.toString(), l: 'Due Soon', c: 'var(--amber)', accent: 'rgba(245,158,11,.12)' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: kpi.accent !== 'transparent' ? kpi.accent : 'var(--bg2)',
            border: `1px solid ${kpi.c === 'var(--text)' ? 'var(--border)' : `${kpi.c}33`}`,
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{
              fontSize: 24, fontWeight: 800, color: kpi.c,
              fontFamily: 'var(--font-mono)', lineHeight: 1, marginBottom: 5,
            }}>
              {kpi.n}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text4)', letterSpacing: '.2px' }}>{kpi.l}</div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {contracts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '72px 20px', color: 'var(--text4)' }}>
          <div style={{ color: 'var(--text4)', opacity: 0.4 }}>
            <DocumentIcon />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text3)', marginBottom: 6 }}>No contracts yet</div>
          <div style={{ fontSize: 12, maxWidth: 300, margin: '0 auto' }}>
            Add service contracts to track recurring revenue and schedule visits automatically.
          </div>
        </div>
      )}

      {/* Contract Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {contracts.map(c => {
          const days = Math.ceil((new Date(c.nextDueDate).getTime() - Date.now()) / 86400000)
          const urgColor = days <= 7 ? 'var(--red)' : days <= 14 ? 'var(--amber)' : 'var(--green)'
          const mrr = Math.round(c.pricePerVisit / (c.frequencyDays / 30))
          const busy = loadingId === c.id

          return (
            <div key={c.id} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 14, overflow: 'hidden',
              opacity: c.active ? 1 : 0.6,
              boxShadow: '0 2px 12px rgba(0,0,0,.25)',
              position: 'relative',
            }}>
              {/* Paused Badge */}
              {!c.active && (
                <div style={{
                  position: 'absolute', top: 12, right: 14,
                  background: 'rgba(255,255,255,.06)', color: 'var(--text4)',
                  fontSize: 9, fontWeight: 800, letterSpacing: '1.2px',
                  padding: '3px 8px', borderRadius: 4,
                  fontFamily: 'var(--font-mono)', border: '1px solid var(--border)',
                  textTransform: 'uppercase',
                }}>
                  PAUSED
                </div>
              )}

              <div style={{ padding: '16px 18px' }}>
                {/* Card Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  {/* Icon Box */}
                  <div style={{
                    fontSize: 22, width: 46, height: 46, borderRadius: 10,
                    background: 'var(--bg4)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)',
                  }}>
                    {c.icon}
                  </div>

                  {/* Name + Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 700, color: 'var(--text)',
                      fontFamily: 'var(--font-display)', textTransform: 'uppercase',
                      letterSpacing: '.3px', lineHeight: 1.2,
                    }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4, lineHeight: 1.4 }}>
                      {c.client}
                      {c.units > 0 && <span> &middot; {c.units} unit{c.units !== 1 ? 's' : ''}</span>}
                      <span> &middot; Every {c.frequencyDays}d</span>
                      {c.techInitials && <span> &middot; {c.techInitials}</span>}
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: 20, fontWeight: 800, color: '#a78bfa',
                      fontFamily: 'var(--font-mono)', lineHeight: 1,
                    }}>
                      ${c.pricePerVisit.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 3 }}>
                      per visit &middot; <span style={{ color: 'var(--green)', fontWeight: 600 }}>${mrr.toLocaleString()}/mo</span>
                    </div>
                  </div>
                </div>

                {/* Stats Mini-Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: c.notes ? 12 : 0 }}>
                  {[
                    {
                      n: days <= 0 ? 'NOW' : `${days}d`,
                      l: 'Until Next Job',
                      c: urgColor,
                    },
                    {
                      n: c.jobsCompleted.toString(),
                      l: 'Jobs Completed',
                      c: undefined,
                    },
                    {
                      n: c.active ? 'Active' : 'Paused',
                      l: 'Status',
                      c: c.active ? 'var(--green)' : 'var(--text4)',
                    },
                  ].map((s, i) => (
                    <div key={i} style={{
                      textAlign: 'center', background: 'var(--bg3)',
                      borderRadius: 10, padding: '10px 6px',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{
                        fontSize: 17, fontWeight: 800,
                        color: s.c ?? 'var(--text)',
                        fontFamily: 'var(--font-mono)', lineHeight: 1, marginBottom: 4,
                      }}>
                        {s.n}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text4)', lineHeight: 1.2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {c.notes && (
                  <div style={{
                    fontSize: 11, color: 'var(--text3)', fontStyle: 'italic',
                    background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px',
                    border: '1px solid var(--border)', lineHeight: 1.5, marginTop: 12,
                  }}>
                    {c.notes}
                  </div>
                )}
              </div>

              {/* Confirm Delete Panel */}
              {confirmDelete === c.id && (
                <div style={{
                  background: 'rgba(239,68,68,.08)', borderTop: '1px solid rgba(239,68,68,.2)',
                  padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, flex: 1 }}>
                    Delete this contract permanently?
                  </span>
                  <button
                    onClick={() => deleteContract(c.id)}
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
              {canEdit && confirmDelete !== c.id && (
                <div style={{
                  display: 'flex', gap: 6, borderTop: '1px solid var(--border)',
                  padding: '12px 18px', background: 'var(--bg3)',
                }}>
                  <button
                    onClick={() => toggleActive(c)}
                    disabled={busy}
                    style={{
                      padding: '7px 16px',
                      background: c.active ? 'transparent' : 'var(--green)',
                      color: c.active ? 'var(--text3)' : '#fff',
                      border: c.active ? '1px solid var(--border)' : 'none',
                      borderRadius: 7, fontSize: 11, fontWeight: 700,
                      cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
                    }}
                  >
                    {busy ? '…' : c.active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    style={{
                      padding: '7px 14px', background: 'transparent', color: 'var(--text3)',
                      border: '1px solid var(--border)', borderRadius: 7, fontSize: 11, cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(c.id)}
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

      {/* Add Contract Modal */}
      {createOpen && (
        <ContractModal
          title="Add Contract"
          icon={createIcon} setIcon={setCreateIcon}
          client={createClient} setClient={setCreateClient}
          name={createName} setName={setCreateName}
          units={createUnits} setUnits={setCreateUnits}
          techInitials={createTechInitials} setTechInitials={setCreateTechInitials}
          frequencyDays={createFrequencyDays} setFrequencyDays={setCreateFrequencyDays}
          pricePerVisit={createPricePerVisit} setPricePerVisit={setCreatePricePerVisit}
          nextDueDate={createNextDueDate} setNextDueDate={setCreateNextDueDate}
          notes={createNotes} setNotes={setCreateNotes}
          loading={createLoading} error={createError}
          onSubmit={submitCreate}
          onCancel={() => { setCreateOpen(false); resetCreateForm() }}
          submitLabel="Add Contract"
        />
      )}

      {/* Edit Contract Modal */}
      {editContract && (
        <ContractModal
          title="Edit Contract"
          icon={editIcon} setIcon={setEditIcon}
          client={editClient} setClient={setEditClient}
          name={editName} setName={setEditName}
          units={editUnits} setUnits={setEditUnits}
          techInitials={editTechInitials} setTechInitials={setEditTechInitials}
          frequencyDays={editFrequencyDays} setFrequencyDays={setEditFrequencyDays}
          pricePerVisit={editPricePerVisit} setPricePerVisit={setEditPricePerVisit}
          nextDueDate={editNextDueDate} setNextDueDate={setEditNextDueDate}
          notes={editNotes} setNotes={setEditNotes}
          loading={editLoading} error={editError}
          onSubmit={submitEdit}
          onCancel={() => setEditContract(null)}
          submitLabel="Save Changes"
        />
      )}
    </div>
  )
}
