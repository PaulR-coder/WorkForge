'use client'

import { useState, useCallback } from 'react'
import type { SessionUser } from '@/lib/auth'
import { useToast } from '@/components/Toast'

type LineItem = {
  id: string
  description: string
  hours?: number
  qty?: number
  unitPrice: number
  total: number
}

type Estimate = {
  id: string
  number: string
  client: string
  clientEmail: string
  jobType: string
  description: string
  lineItems: LineItem[]
  subtotal: number
  status: 'draft' | 'sent' | 'approved' | 'declined'
  notes: string
  createdAt: string
  createdBy: { name: string; initials: string }
  job: { id: string; status: string } | null
}

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  draft:    { color: 'var(--text3)', bg: 'var(--bg4)', label: 'Draft' },
  sent:     { color: '#5ba3f5', bg: 'rgba(91,163,245,.12)', label: 'Sent' },
  approved: { color: 'var(--green)', bg: 'rgba(34,197,94,.12)', label: 'Approved' },
  declined: { color: 'var(--red)', bg: 'rgba(239,68,68,.12)', label: 'Declined' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.draft
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, color: s.color, background: s.bg, textTransform: 'capitalize', letterSpacing: '.3px' }}>
      {s.label}
    </span>
  )
}

function newItem(): LineItem {
  return { id: `item-${Date.now()}-${Math.random()}`, description: '', unitPrice: 0, total: 0 }
}

export default function EstimatesClient({
  session,
  initialEstimates,
}: {
  session: SessionUser
  initialEstimates: Estimate[]
}) {
  const { toast } = useToast()
  const [estimates, setEstimates] = useState<Estimate[]>(
    initialEstimates.map(e => ({ ...e, lineItems: (e.lineItems as LineItem[]) ?? [], job: e.job ?? null }))
  )
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'approved' | 'declined'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Estimate | null>(null)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [emailPrompt, setEmailPrompt] = useState<{ id: string; current: string } | null>(null)

  // Form state
  const [client, setClient] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [jobType, setJobType] = useState('')
  const [description, setDescription] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([newItem()])
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<Estimate['status']>('draft')

  const subtotal = lineItems.reduce((s, i) => s + (i.total || 0), 0)

  function openCreate() {
    setEditTarget(null)
    setClient(''); setClientEmail(''); setJobType(''); setDescription('')
    setLineItems([newItem()]); setNotes(''); setStatus('draft')
    setModalOpen(true)
  }

  function openEdit(est: Estimate) {
    setEditTarget(est)
    setClient(est.client); setClientEmail(est.clientEmail ?? ''); setJobType(est.jobType)
    setDescription(est.description)
    setLineItems(est.lineItems.length ? est.lineItems : [newItem()])
    setNotes(est.notes); setStatus(est.status)
    setModalOpen(true)
  }

  function updateItem(id: string, field: keyof LineItem, raw: string) {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const val = field === 'description' ? raw : parseFloat(raw) || 0
      const updated = { ...item, [field]: val }
      if (field === 'hours') updated.total = (parseFloat(raw) || 0) * (item.unitPrice || 0)
      if (field === 'qty') updated.total = (parseFloat(raw) || 0) * (item.unitPrice || 0)
      if (field === 'unitPrice') {
        const qty = item.qty ?? item.hours ?? 1
        updated.total = (parseFloat(raw) || 0) * qty
      }
      if (field === 'total') updated.total = parseFloat(raw) || 0
      return updated
    }))
  }

  async function generateAI() {
    if (!description.trim()) { toast('Add a description first', 'error'); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/estimates/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client, jobType, description }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error || 'AI generation failed', 'error'); return }
      setLineItems(data.lineItems)
      toast('AI generated line items', 'success')
    } catch { toast('Network error', 'error') }
    finally { setAiLoading(false) }
  }

  const save = useCallback(async () => {
    if (!client.trim()) { toast('Client name required', 'error'); return }
    setSaving(true)
    const body = { client, clientEmail, jobType, description, lineItems, subtotal, notes, status }
    try {
      let res: Response
      if (editTarget) {
        res = await fetch(`/api/estimates/${editTarget.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        res = await fetch('/api/estimates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      const data = await res.json()
      if (!res.ok) { toast(data.error || 'Save failed', 'error'); return }
      const parsed: Estimate = { ...data, lineItems: (data.lineItems as LineItem[]) ?? [], job: data.job ?? null }
      setEstimates(prev => editTarget ? prev.map(e => e.id === editTarget.id ? parsed : e) : [parsed, ...prev])
      setModalOpen(false)
      toast(editTarget ? 'Estimate updated' : 'Estimate created', 'success')
    } catch { toast('Network error', 'error') }
    finally { setSaving(false) }
  }, [client, clientEmail, jobType, description, lineItems, subtotal, notes, status, editTarget, toast])

  async function sendEstimate(est: Estimate) {
    if (!est.clientEmail?.trim()) {
      setEmailPrompt({ id: est.id, current: '' })
      return
    }
    setSendingId(est.id)
    const res = await fetch(`/api/estimates/${est.id}/send`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setEstimates(prev => prev.map(e => e.id === est.id ? { ...e, status: 'sent' } : e))
      toast('Estimate emailed to client', 'success')
    } else {
      toast(data.error || 'Send failed', 'error')
    }
    setSendingId(null)
  }

  async function sendWithEmail(id: string, email: string) {
    if (!email.trim()) { toast('Email required', 'error'); return }
    // Save email first
    const patch = await fetch(`/api/estimates/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientEmail: email }),
    })
    if (!patch.ok) { toast('Failed to save email', 'error'); return }
    setEstimates(prev => prev.map(e => e.id === id ? { ...e, clientEmail: email } : e))
    setEmailPrompt(null)
    setSendingId(id)
    const res = await fetch(`/api/estimates/${id}/send`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setEstimates(prev => prev.map(e => e.id === id ? { ...e, status: 'sent', clientEmail: email } : e))
      toast('Estimate emailed to client', 'success')
    } else {
      toast(data.error || 'Send failed', 'error')
    }
    setSendingId(null)
  }

  async function convertToJob(est: Estimate) {
    if (est.job) { toast('Job already created', 'error'); return }
    setConvertingId(est.id)
    const res = await fetch(`/api/estimates/${est.id}/convert-job`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    const data = await res.json()
    if (res.ok) {
      setEstimates(prev => prev.map(e => e.id === est.id ? { ...e, status: 'approved', job: { id: data.jobId, status: 'open' } } : e))
      toast('Job created — assign a tech in Work Orders', 'success')
    } else {
      toast(data.error || 'Failed to create job', 'error')
    }
    setConvertingId(null)
  }

  async function convertToInvoice(est: Estimate) {
    if (!est.job) return
    setConvertingId(est.id)
    const res = await fetch(`/api/jobs/${est.job.id}/convert-invoice`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      toast(`Invoice ${data.number} created — go to Invoices to send it`, 'success')
    } else {
      toast(data.error || 'Failed to create invoice', 'error')
    }
    setConvertingId(null)
  }

  async function deleteEst(est: Estimate) {
    if (!confirm(`Delete ${est.number}?`)) return
    const res = await fetch(`/api/estimates/${est.id}`, { method: 'DELETE' })
    if (res.ok) {
      setEstimates(prev => prev.filter(e => e.id !== est.id))
      toast('Deleted', 'success')
    } else {
      toast('Delete failed', 'error')
    }
  }

  async function updateStatus(est: Estimate, newStatus: Estimate['status']) {
    const res = await fetch(`/api/estimates/${est.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setEstimates(prev => prev.map(e => e.id === est.id ? { ...e, status: newStatus } : e))
    }
  }

  const filtered = filter === 'all' ? estimates : estimates.filter(e => e.status === filter)
  const counts = { all: estimates.length, draft: 0, sent: 0, approved: 0, declined: 0 }
  estimates.forEach(e => { counts[e.status] = (counts[e.status] ?? 0) + 1 })

  return (
    <div style={{ padding: '20px 20px 80px', maxWidth: 960 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Estimates</h1>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>Create → Email → Approve → Job → Invoice</div>
        </div>
        <button onClick={openCreate} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>+ New Estimate</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['all', 'draft', 'sent', 'approved', 'declined'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)',
            background: filter === f ? 'var(--amber)' : 'var(--bg2)',
            color: filter === f ? '#080c1a' : 'var(--text3)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
          }}>
            {f}{counts[f] > 0 ? ` (${counts[f]})` : ''}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text4)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No estimates yet</div>
          <div style={{ fontSize: 12, marginBottom: 16 }}>Create your first AI-powered estimate</div>
          <button onClick={openCreate} className="btn btn-primary btn-sm">+ New Estimate</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(est => {
            const jobDone = est.job?.status === 'done'
            const hasJob = !!est.job
            const busy = sendingId === est.id || convertingId === est.id
            return (
              <div key={est.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>{est.number}</span>
                      <StatusBadge status={est.status} />
                      {est.jobType && (
                        <span style={{ fontSize: 10, color: 'var(--text4)', background: 'var(--bg3)', padding: '2px 7px', borderRadius: 10 }}>{est.jobType}</span>
                      )}
                      {hasJob && (
                        <span style={{ fontSize: 10, color: 'var(--green)', background: 'rgba(34,197,94,.1)', padding: '2px 7px', borderRadius: 10 }}>
                          Job {jobDone ? 'Complete' : 'Active'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{est.client}</div>
                    {est.clientEmail && (
                      <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 2 }}>📧 {est.clientEmail}</div>
                    )}
                    {est.description && (
                      <div style={{ fontSize: 11, color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>{est.description}</div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 4 }}>
                      {est.lineItems.length} item{est.lineItems.length !== 1 ? 's' : ''} · {est.createdBy.name} · {new Date(est.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>
                      ${est.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>

                    {/* Action buttons — contextual based on workflow stage */}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {/* Email button — always available unless declined */}
                      {est.status !== 'declined' && est.status !== 'approved' && (
                        <button
                          onClick={() => sendEstimate(est)}
                          disabled={busy}
                          style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 11, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? .6 : 1 }}
                        >
                          {sendingId === est.id ? '…' : '📧 Send'}
                        </button>
                      )}

                      {/* Convert to Job — when approved but no job yet */}
                      {est.status === 'approved' && !hasJob && (
                        <button
                          onClick={() => convertToJob(est)}
                          disabled={busy}
                          style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: 'var(--amber)', color: '#080c1a', fontSize: 11, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? .6 : 1 }}
                        >
                          {convertingId === est.id ? '…' : '🔧 Create Job'}
                        </button>
                      )}

                      {/* Convert to Invoice — when job is done */}
                      {hasJob && jobDone && (
                        <button
                          onClick={() => convertToInvoice(est)}
                          disabled={busy}
                          style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: 'var(--green)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? .6 : 1 }}
                        >
                          {convertingId === est.id ? '…' : '💰 Create Invoice'}
                        </button>
                      )}

                      <select
                        value={est.status}
                        onChange={e => updateStatus(est, e.target.value as Estimate['status'])}
                        style={{ fontSize: 10, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text3)', cursor: 'pointer' }}
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="approved">Approved</option>
                        <option value="declined">Declined</option>
                      </select>
                      <button onClick={() => openEdit(est)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text3)', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => deleteEst(est)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--red)', fontSize: 11, cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Email prompt modal */}
      {emailPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setEmailPrompt(null) }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 400 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Client Email</h3>
            <p style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 16 }}>Enter the client's email address to send the estimate.</p>
            <input
              type="email"
              autoFocus
              placeholder="client@example.com"
              defaultValue={emailPrompt.current}
              id="email-prompt-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, marginBottom: 14, boxSizing: 'border-box' }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const input = document.getElementById('email-prompt-input') as HTMLInputElement
                  sendWithEmail(emailPrompt.id, input.value)
                }
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEmailPrompt(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={() => {
                  const input = document.getElementById('email-prompt-input') as HTMLInputElement
                  sendWithEmail(emailPrompt.id, input.value)
                }}
                className="btn btn-primary"
                style={{ flex: 2, padding: '9px 0', fontSize: 13 }}
              >
                Send Estimate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 680, padding: 28, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{editTarget ? `Edit ${editTarget.number}` : 'New Estimate'}</h2>
              <button onClick={() => setModalOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text4)', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Client + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>CLIENT *</label>
                <input value={client} onChange={e => setClient(e.target.value)} placeholder="Client name"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>CLIENT EMAIL</label>
                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@example.com"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13 }} />
              </div>
            </div>

            {/* Job Type */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>JOB TYPE</label>
              <input value={jobType} onChange={e => setJobType(e.target.value)} placeholder="HVAC, Electrical, Plumbing…"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13 }} />
            </div>

            {/* Description + AI */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)' }}>DESCRIPTION</label>
                <button onClick={generateAI} disabled={aiLoading || !description.trim()} style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 20, background: aiLoading ? 'var(--bg3)' : 'linear-gradient(135deg, #f59e0b, #f97316)', border: 'none', color: aiLoading ? 'var(--text4)' : '#080c1a', fontSize: 11, fontWeight: 800, cursor: aiLoading ? 'not-allowed' : 'pointer', opacity: !description.trim() ? .4 : 1 }}>
                  {aiLoading ? '⏳ Generating…' : '✨ Generate with AI'}
                </button>
              </div>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the job — AI will generate line items from this" rows={3}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            {/* Line Items */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)' }}>LINE ITEMS</label>
                <button onClick={() => setLineItems(prev => [...prev, newItem()])} style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text3)', fontSize: 11, cursor: 'pointer' }}>+ Add</button>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px 32px', background: 'var(--bg3)', padding: '7px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text4)', letterSpacing: '.3px' }}>
                  <span>DESCRIPTION</span><span style={{ textAlign: 'center' }}>HRS/QTY</span><span style={{ textAlign: 'right' }}>UNIT $</span><span style={{ textAlign: 'right' }}>TOTAL</span><span />
                </div>
                {lineItems.map((item, idx) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px 32px', padding: '6px 10px', borderTop: idx > 0 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                    <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Description"
                      style={{ padding: '5px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 12, width: '100%' }} />
                    <input value={item.hours ?? item.qty ?? ''} onChange={e => updateItem(item.id, item.hours !== undefined ? 'hours' : 'qty', e.target.value)}
                      onFocus={() => { if (item.hours === undefined && item.qty === undefined) updateItem(item.id, 'qty', '1') }}
                      type="number" min="0" placeholder="1"
                      style={{ padding: '5px 4px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 12, textAlign: 'center', width: '100%' }} />
                    <input value={item.unitPrice || ''} onChange={e => updateItem(item.id, 'unitPrice', e.target.value)} type="number" min="0" placeholder="0"
                      style={{ padding: '5px 4px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 12, textAlign: 'right', width: '100%' }} />
                    <input value={item.total || ''} onChange={e => updateItem(item.id, 'total', e.target.value)} type="number" min="0" placeholder="0"
                      style={{ padding: '5px 4px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--green)', fontSize: 12, fontWeight: 700, textAlign: 'right', width: '100%' }} />
                    <button onClick={() => setLineItems(prev => prev.filter(i => i.id !== item.id))} disabled={lineItems.length === 1}
                      style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 14, cursor: 'pointer', opacity: lineItems.length === 1 ? .3 : 1 }}>✕</button>
                  </div>
                ))}
                <div style={{ padding: '10px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>Subtotal</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Status + Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>STATUS</label>
                <select value={status} onChange={e => setStatus(e.target.value as Estimate['status'])} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13 }}>
                  <option value="draft">Draft</option><option value="sent">Sent</option><option value="approved">Approved</option><option value="declined">Declined</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>NOTES</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes…"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13 }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalOpen(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving || !client.trim()} className="btn btn-primary" style={{ padding: '9px 22px', fontSize: 13 }}>
                {saving ? 'Saving…' : editTarget ? 'Update' : 'Create Estimate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
