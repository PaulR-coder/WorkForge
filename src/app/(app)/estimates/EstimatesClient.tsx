'use client'

import { useState, useCallback } from 'react'
import type { SessionUser } from '@/lib/auth'
import { useToast } from '@/components/Toast'
import { trackEvent } from '@/lib/posthog'

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

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  draft:    { color: 'var(--text3)', bg: 'rgba(122,143,166,.1)', border: 'rgba(122,143,166,.2)', label: 'Draft' },
  sent:     { color: '#5ba3f5', bg: 'rgba(91,163,245,.12)', border: 'rgba(91,163,245,.25)', label: 'Sent' },
  approved: { color: 'var(--green)', bg: 'rgba(34,197,94,.12)', border: 'rgba(34,197,94,.25)', label: 'Approved' },
  declined: { color: 'var(--red)', bg: 'rgba(239,68,68,.12)', border: 'rgba(239,68,68,.25)', label: 'Declined' },
}

// Workflow pipeline stages
const PIPELINE_STAGES = ['Create', 'Email', 'Approve', 'Job', 'Invoice']
const STAGE_MAP: Record<string, number> = {
  draft: 0, sent: 1, approved: 2,
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.draft
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 20, color: s.color, background: s.bg, border: `1px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '.6px', fontFamily: 'var(--font-display, system-ui)' }}>
      {s.label}
    </span>
  )
}

function PipelineIndicator({ estimate }: { estimate: Estimate }) {
  const activeStage = estimate.job?.status === 'done' ? 4 : (estimate.job ? 3 : (STAGE_MAP[estimate.status] ?? 0))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {PIPELINE_STAGES.map((stage, i) => {
        const done = i < activeStage
        const current = i === activeStage
        return (
          <div key={stage} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
              fontFamily: 'var(--font-display, system-ui)', letterSpacing: '.4px',
              background: done ? 'rgba(34,197,94,.15)' : current ? 'rgba(245,158,11,.15)' : 'rgba(255,255,255,.04)',
              color: done ? 'var(--green)' : current ? 'var(--amber)' : 'var(--text4)',
              border: done ? '1px solid rgba(34,197,94,.25)' : current ? '1px solid rgba(245,158,11,.25)' : '1px solid rgba(255,255,255,.07)',
            }}>
              {stage}
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <div style={{ width: 16, height: 1, background: done ? 'rgba(34,197,94,.3)' : 'rgba(255,255,255,.07)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function newItem(): LineItem {
  return { id: `item-${Date.now()}-${Math.random()}`, description: '', unitPrice: 0, total: 0 }
}

// SVG icons
function IconSend() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}
function IconWrench() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  )
}
function IconInvoice() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}
function IconSparkle() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M5 3l.8 2.2L8 6l-2.2.8L5 9l-.8-2.2L2 6l2.2-.8L5 3z"/>
    </svg>
  )
}
const ALL_TRADES = [
  'Painting',
  'Drywall',
  'Demolition',
  'Tile',
  'Flooring - LVP',
  'Flooring - Hardwood',
  'Flooring - Carpet',
] as const

function IconEmptyEstimates() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto', opacity: .2 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}

const formInp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.09)',
  background: '#111827', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
  fontFamily: 'inherit', outline: 'none',
}
const formLbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--text4)', display: 'block', marginBottom: 5,
  textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'var(--font-display, system-ui)',
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
  // Construction estimator fields
  const [selectedTrades, setSelectedTrades] = useState<string[]>([])
  const [sqft, setSqft] = useState('')
  const [jobMode, setJobMode] = useState<'new_construction' | 'remodel' | 'repair' | ''>('')
  const [finishLevel, setFinishLevel] = useState('')

  function toggleTrade(t: string) {
    setSelectedTrades(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  const subtotal = lineItems.reduce((s, i) => s + (i.total || 0), 0)

  function openCreate() {
    setEditTarget(null)
    setClient(''); setClientEmail(''); setJobType(''); setDescription('')
    setLineItems([newItem()]); setNotes(''); setStatus('draft')
    setSelectedTrades([]); setSqft(''); setJobMode(''); setFinishLevel('')
    setModalOpen(true)
  }

  function openEdit(est: Estimate) {
    setEditTarget(est)
    setClient(est.client); setClientEmail(est.clientEmail ?? ''); setJobType(est.jobType)
    setDescription(est.description)
    setLineItems(est.lineItems.length ? est.lineItems : [newItem()])
    setNotes(est.notes); setStatus(est.status)
    setSelectedTrades([]); setSqft(''); setJobMode(''); setFinishLevel('')
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
    const hasConstruction = selectedTrades.length > 0
    if (!hasConstruction && !description.trim()) { toast('Select at least one trade or add a description', 'error'); return }
    if (hasConstruction && !sqft) { toast('Enter square footage', 'error'); return }
    setAiLoading(true)
    try {
      const body: Record<string, unknown> = {
        client,
        jobType,
        description: description || selectedTrades.join(' + ') + ' job',
      }
      if (hasConstruction) {
        body.trades = selectedTrades
        body.sqft = parseFloat(sqft)
        if (jobMode) body.jobMode = jobMode
        if (finishLevel) body.finishLevel = finishLevel
      }
      const res = await fetch('/api/estimates/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error || 'AI generation failed', 'error'); return }
      setLineItems(data.lineItems)
      if (hasConstruction && !jobType) setJobType(selectedTrades.join(' + '))
      toast(`AI generated estimate${selectedTrades.length > 1 ? ` for ${selectedTrades.length} trades` : ''}`, 'success')
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
    <div style={{ padding: '20px 16px 80px', maxWidth: 1000 }}>
      <style>{`
        /* Workflow pipeline: horizontal scroll on mobile */
        @media (max-width: 639px) {
          .wf-mobile-pipeline {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
            flex-wrap: nowrap !important;
            padding-bottom: 4px;
          }
          .wf-mobile-pipeline > div {
            flex-wrap: nowrap !important;
          }
        }
        /* Estimate card: stack left/middle/right vertically on mobile */
        @media (max-width: 639px) {
          .wf-mobile-est-card-inner {
            flex-direction: column !important;
            gap: 10px !important;
          }
          .wf-mobile-est-right {
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
          }
          .wf-mobile-est-right > div:first-child {
            font-size: 20px !important;
          }
        }
        /* Modal line items table: horizontal scroll */
        @media (max-width: 639px) {
          .wf-mobile-lineitems-scroll {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
          }
          .wf-mobile-lineitems-scroll > div {
            min-width: 480px;
          }
          /* Modal two-column grids: single column */
          .wf-mobile-modal-2col {
            grid-template-columns: 1fr !important;
          }
          .wf-mobile-modal-status-grid {
            grid-template-columns: 1fr !important;
          }
        }
        /* Ensure all buttons are minimum 44px touch target */
        @media (max-width: 639px) {
          .wf-mobile-est-actions button {
            min-height: 44px;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'var(--font-display, system-ui)', letterSpacing: '-.2px' }}>Estimates</h1>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 3 }}>
            {estimates.length} estimate{estimates.length !== 1 ? 's' : ''} &middot; {counts.approved} approved &middot; {counts.declined} declined
          </div>
        </div>
        <button onClick={openCreate} style={{ padding: '8px 16px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0, fontFamily: 'var(--font-display, system-ui)', letterSpacing: '.3px' }}>
          + New Estimate
        </button>
      </div>

      {/* Workflow pipeline indicator */}
      <div className="wf-mobile-pipeline" style={{ marginBottom: 20, padding: '12px 16px', background: '#0a0f1e', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'var(--font-display, system-ui)', flexShrink: 0 }}>Workflow</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'nowrap' }}>
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage} style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,.05)', color: 'var(--text3)', border: '1px solid rgba(255,255,255,.08)', fontFamily: 'var(--font-display, system-ui)' }}>{stage}</span>
              {i < PIPELINE_STAGES.length - 1 && (
                <svg width="20" height="10" viewBox="0 0 20 10" style={{ flexShrink: 0 }}>
                  <line x1="0" y1="5" x2="14" y2="5" stroke="rgba(255,255,255,.15)" strokeWidth="1.5"/>
                  <polyline points="10,2 14,5 10,8" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['all', 'draft', 'sent', 'approved', 'declined'] as const).map(f => {
          const active = filter === f
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 13px', borderRadius: 20,
              border: active ? 'none' : '1px solid rgba(255,255,255,.09)',
              background: active ? 'var(--amber)' : '#111827',
              color: active ? '#080c1a' : 'var(--text3)',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
              fontFamily: 'var(--font-display, system-ui)', letterSpacing: '.3px',
              transition: 'background .15s, color .15s',
            }}>
              {f}
              {counts[f] > 0 && <span style={{ marginLeft: 5, opacity: active ? 0.7 : 0.5 }}>{counts[f]}</span>}
            </button>
          )
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text4)' }}>
          <IconEmptyEstimates />
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, marginTop: 16, color: 'var(--text3)', fontFamily: 'var(--font-display, system-ui)' }}>No estimates yet</div>
          <div style={{ fontSize: 12, marginBottom: 18 }}>Create your first AI-powered estimate</div>
          <button onClick={openCreate} style={{ padding: '8px 18px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-display, system-ui)' }}>+ New Estimate</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {filtered.map(est => {
            const jobDone = est.job?.status === 'done'
            const hasJob = !!est.job
            const busy = sendingId === est.id || convertingId === est.id
            const ss = STATUS_STYLE[est.status] ?? STATUS_STYLE.draft
            return (
              <div key={est.id} style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,.09)', borderRadius: 12, overflow: 'hidden' }}>
                {/* Left accent bar colored by status */}
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 3, background: ss.color, flexShrink: 0 }} />
                  <div className="wf-mobile-est-card-inner" style={{ flex: 1, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>

                    {/* Left: number + status + job type */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0, minWidth: 80 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', fontFamily: 'var(--font-mono, monospace)' }}>{est.number}</div>
                      <StatusBadge status={est.status} />
                      {est.jobType && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'rgba(167,139,250,.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,.2)', letterSpacing: '.3px', fontFamily: 'var(--font-display, system-ui)' }}>{est.jobType}</span>
                      )}
                      {hasJob && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'rgba(34,197,94,.1)', color: 'var(--green)', border: '1px solid rgba(34,197,94,.2)', letterSpacing: '.3px', fontFamily: 'var(--font-display, system-ui)' }}>
                          Job {jobDone ? 'Done' : 'Active'}
                        </span>
                      )}
                    </div>

                    {/* Middle: client info + description */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{est.client}</div>
                      {est.clientEmail && (
                        <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 4, fontFamily: 'var(--font-mono, monospace)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{est.clientEmail}</div>
                      )}
                      {est.description && (
                        <div style={{ fontSize: 11, color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380, marginBottom: 4 }}>{est.description}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        <PipelineIndicator estimate={est} />
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text4)', marginTop: 5, fontFamily: 'var(--font-mono, monospace)' }}>
                        {est.lineItems.length} item{est.lineItems.length !== 1 ? 's' : ''} &middot; {est.createdBy.name} &middot; {new Date(est.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Right: amount + actions */}
                    <div className="wf-mobile-est-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>
                        ${est.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>

                      {/* Action buttons stacked by workflow */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {est.status !== 'declined' && est.status !== 'approved' && (
                            <button onClick={() => sendEstimate(est)} disabled={busy}
                              style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: 'rgba(91,163,245,.15)', color: '#5ba3f5', fontSize: 10, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? .6 : 1, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-display, system-ui)' }}>
                              <IconSend />{sendingId === est.id ? '…' : 'Send'}
                            </button>
                          )}
                          {est.status === 'approved' && !hasJob && (
                            <button onClick={() => convertToJob(est)} disabled={busy}
                              style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: 'rgba(245,158,11,.15)', color: 'var(--amber)', fontSize: 10, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? .6 : 1, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-display, system-ui)' }}>
                              <IconWrench />{convertingId === est.id ? '…' : 'Create Job'}
                            </button>
                          )}
                          {hasJob && jobDone && (
                            <button onClick={() => convertToInvoice(est)} disabled={busy}
                              style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: 'rgba(34,197,94,.15)', color: 'var(--green)', fontSize: 10, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? .6 : 1, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-display, system-ui)' }}>
                              <IconInvoice />{convertingId === est.id ? '…' : 'Invoice'}
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <select value={est.status} onChange={e => updateStatus(est, e.target.value as Estimate['status'])}
                            style={{ fontSize: 10, padding: '4px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,.09)', background: '#111827', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-display, system-ui)' }}>
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="approved">Approved</option>
                            <option value="declined">Declined</option>
                          </select>
                          <button onClick={() => openEdit(est)} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid rgba(255,255,255,.09)', background: '#111827', color: 'var(--text3)', fontSize: 10, cursor: 'pointer', fontFamily: 'var(--font-display, system-ui)' }}>Edit</button>
                          <button onClick={() => deleteEst(est)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,.09)', background: '#111827', color: 'var(--red)', fontSize: 11, cursor: 'pointer', lineHeight: 1 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      </div>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setEmailPrompt(null) }}>
          <div style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,.09)', borderRadius: 14, overflow: 'hidden', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,.7)' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #5ba3f5, #818cf8)' }} />
            <div style={{ padding: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 6, fontFamily: 'var(--font-display, system-ui)' }}>Client Email</h3>
              <p style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 16 }}>Enter the client&apos;s email address to send the estimate.</p>
              <input
                type="email"
                autoFocus
                placeholder="client@example.com"
                defaultValue={emailPrompt.current}
                id="email-prompt-input"
                style={{ ...formInp, fontFamily: 'var(--font-mono, monospace)', marginBottom: 14 }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const input = document.getElementById('email-prompt-input') as HTMLInputElement
                    sendWithEmail(emailPrompt.id, input.value)
                  }
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEmailPrompt(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,.09)', background: '#111827', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={() => {
                    const input = document.getElementById('email-prompt-input') as HTMLInputElement
                    sendWithEmail(emailPrompt.id, input.value)
                  }}
                  style={{ flex: 2, padding: '9px 0', borderRadius: 8, background: '#5ba3f5', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display, system-ui)' }}
                >
                  Send Estimate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,.09)', borderRadius: 16, width: '100%', maxWidth: 700, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.7)', position: 'relative' }}>
            {/* Amber accent strip */}
            <div style={{ height: 3, background: 'linear-gradient(90deg, var(--amber), #f97316)' }} />
            <div style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'var(--font-display, system-ui)' }}>{editTarget ? `Edit ${editTarget.number}` : 'New Estimate'}</h2>
                  <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>Fill in details and optionally generate line items with AI.</div>
                </div>
                <button onClick={() => setModalOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text4)', fontSize: 18, cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Client + Email */}
              <div className="wf-mobile-modal-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={formLbl}>Client *</label>
                  <input value={client} onChange={e => setClient(e.target.value)} placeholder="Client name" style={formInp} />
                </div>
                <div>
                  <label style={formLbl}>Client Email</label>
                  <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@example.com" style={{ ...formInp, fontFamily: 'var(--font-mono, monospace)' }} />
                </div>
              </div>

              {/* Construction Estimator */}
              <div style={{ marginBottom: 14, background: 'rgba(245,158,11,.04)', border: '1px solid rgba(245,158,11,.15)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--font-display, system-ui)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconSparkle /> AI Estimator — pick your trades, enter sqft, generate
                </div>

                {/* Trade chips — multi-select */}
                <div style={{ marginBottom: 12 }}>
                  <label style={formLbl}>Trades <span style={{ opacity: .5, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(select all that apply)</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {ALL_TRADES.map(t => {
                      const on = selectedTrades.includes(t)
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTrade(t)}
                          style={{
                            padding: '6px 13px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                            fontFamily: 'var(--font-display, system-ui)', letterSpacing: '.3px',
                            border: on ? 'none' : '1px solid rgba(255,255,255,.12)',
                            background: on ? 'var(--amber)' : '#111827',
                            color: on ? '#080c1a' : 'var(--text3)',
                            transition: 'background .12s, color .12s, border .12s',
                          }}
                        >
                          {on && <span style={{ marginRight: 4 }}>✓</span>}{t}
                        </button>
                      )
                    })}
                  </div>
                  {selectedTrades.length > 1 && (
                    <div style={{ marginTop: 7, fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>
                      {selectedTrades.length} trades selected — AI will generate separate sections for each
                    </div>
                  )}
                </div>

                <div className="wf-mobile-modal-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={formLbl}>Square Footage</label>
                    <input type="number" min="0" value={sqft} onChange={e => setSqft(e.target.value)} placeholder="e.g. 1200" style={formInp} />
                  </div>
                  <div>
                    <label style={formLbl}>Job Type</label>
                    <select value={jobMode} onChange={e => setJobMode(e.target.value as typeof jobMode)} style={formInp}>
                      <option value="">— select —</option>
                      <option value="new_construction">New Construction</option>
                      <option value="remodel">Remodel / Renovation</option>
                      <option value="repair">Repair</option>
                    </select>
                  </div>
                </div>

                {(selectedTrades.includes('Painting') || selectedTrades.includes('Drywall')) && (
                  <div style={{ marginBottom: 10 }}>
                    <label style={formLbl}>Finish Level</label>
                    <select value={finishLevel} onChange={e => setFinishLevel(e.target.value)} style={formInp}>
                      <option value="">— standard —</option>
                      {selectedTrades.includes('Drywall') && <option value="Level 4">Level 4 — standard paint-ready</option>}
                      {selectedTrades.includes('Drywall') && <option value="Level 5">Level 5 — skim coat (premium)</option>}
                      {selectedTrades.includes('Painting') && !selectedTrades.includes('Drywall') && <option value="Standard">Standard — 2 finish coats</option>}
                      {selectedTrades.includes('Painting') && !selectedTrades.includes('Drywall') && <option value="Level 5 prep">Level 5 surface — extra prep required</option>}
                    </select>
                  </div>
                )}

                <button
                  onClick={generateAI}
                  disabled={aiLoading || (selectedTrades.length > 0 && !sqft) || (selectedTrades.length === 0 && !description.trim())}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 8,
                    background: aiLoading ? '#111827' : 'linear-gradient(135deg, var(--amber), #f97316)',
                    border: aiLoading ? '1px solid rgba(255,255,255,.09)' : 'none',
                    color: aiLoading ? 'var(--text4)' : '#080c1a',
                    fontSize: 12, fontWeight: 800, cursor: aiLoading ? 'wait' : 'pointer',
                    opacity: (selectedTrades.length > 0 && !sqft) || (selectedTrades.length === 0 && !description.trim()) ? .4 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    fontFamily: 'var(--font-display, system-ui)', letterSpacing: '.3px',
                  }}
                >
                  <IconSparkle />
                  {aiLoading
                    ? `Generating${selectedTrades.length > 1 ? ` ${selectedTrades.length} trades` : ''}…`
                    : selectedTrades.length > 1
                      ? `Generate Combined Estimate — ${selectedTrades.length} Trades`
                      : 'Generate Line Items with AI'
                  }
                </button>
              </div>

              {/* Job Type (manual override) */}
              <div style={{ marginBottom: 14 }}>
                <label style={formLbl}>Job Type <span style={{ opacity: .5, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(auto-filled from trade, or type your own)</span></label>
                <input value={jobType} onChange={e => setJobType(e.target.value)} placeholder="Painting, Drywall, Demolition…" style={formInp} />
              </div>

              {/* Description */}
              <div style={{ marginBottom: 14 }}>
                <label style={formLbl}>Additional Details <span style={{ opacity: .5, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — adds context to AI bid)</span></label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any extra details — room types, special conditions, access issues, GC notes…" rows={2}
                  style={{ ...formInp, resize: 'vertical' }} />
              </div>

              {/* Line Items */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ ...formLbl, marginBottom: 0 }}>Line Items</label>
                  <button onClick={() => setLineItems(prev => [...prev, newItem()])}
                    style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,.09)', background: '#111827', color: 'var(--text3)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-display, system-ui)', minHeight: 44 }}>+ Add</button>
                </div>
                <div className="wf-mobile-lineitems-scroll" style={{ border: '1px solid rgba(255,255,255,.09)', borderRadius: 10, overflow: 'hidden' }}>
                  {/* Table header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px 32px', background: '#141d2e', padding: '8px 12px', fontSize: 9, fontWeight: 700, color: 'var(--text4)', letterSpacing: '.5px', fontFamily: 'var(--font-display, system-ui)' }}>
                    <span>DESCRIPTION</span>
                    <span style={{ textAlign: 'center' }}>HRS/QTY</span>
                    <span style={{ textAlign: 'right' }}>UNIT $</span>
                    <span style={{ textAlign: 'right' }}>TOTAL</span>
                    <span />
                  </div>
                  {lineItems.map((item, idx) => {
                    const isSection = item.description.startsWith('── ') && item.unitPrice === 0 && item.total === 0
                    if (isSection) {
                      return (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderTop: '1px solid rgba(255,255,255,.06)', background: 'rgba(245,158,11,.06)' }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-display, system-ui)' }}>
                            {item.description.replace(/^── /, '').replace(/ ──$/, '')}
                          </span>
                          <button onClick={() => setLineItems(prev => prev.filter(i => i.id !== item.id))}
                            style={{ background: 'none', border: 'none', color: 'var(--text4)', fontSize: 11, cursor: 'pointer', opacity: .5 }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      )
                    }
                    return (
                    <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px 32px', padding: '6px 12px', borderTop: '1px solid rgba(255,255,255,.06)', alignItems: 'center', background: idx % 2 === 1 ? 'rgba(255,255,255,.015)' : 'transparent' }}>
                      <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Description"
                        style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,.07)', background: '#060a17', color: 'var(--text)', fontSize: 12, width: '100%', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                      <input value={item.hours ?? item.qty ?? ''} onChange={e => updateItem(item.id, item.hours !== undefined ? 'hours' : 'qty', e.target.value)}
                        onFocus={() => { if (item.hours === undefined && item.qty === undefined) updateItem(item.id, 'qty', '1') }}
                        type="number" min="0" placeholder="1"
                        style={{ padding: '5px 4px', borderRadius: 6, border: '1px solid rgba(255,255,255,.07)', background: '#060a17', color: 'var(--text)', fontSize: 12, textAlign: 'center', width: '100%', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-mono, monospace)' }} />
                      <input value={item.unitPrice || ''} onChange={e => updateItem(item.id, 'unitPrice', e.target.value)} type="number" min="0" placeholder="0"
                        style={{ padding: '5px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,.07)', background: '#060a17', color: 'var(--text)', fontSize: 12, textAlign: 'right', width: '100%', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-mono, monospace)' }} />
                      <input value={item.total || ''} onChange={e => updateItem(item.id, 'total', e.target.value)} type="number" min="0" placeholder="0"
                        style={{ padding: '5px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,.07)', background: '#060a17', color: 'var(--green)', fontSize: 12, fontWeight: 700, textAlign: 'right', width: '100%', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-mono, monospace)' }} />
                      <button onClick={() => setLineItems(prev => prev.filter(i => i.id !== item.id))} disabled={lineItems.length === 1}
                        style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 14, cursor: 'pointer', opacity: lineItems.length === 1 ? .3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                    )
                  })}
                  {/* Subtotal row */}
                  <div style={{ padding: '11px 14px', borderTop: '1px solid rgba(255,255,255,.09)', display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center', background: '#0a0f1e' }}>
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-display, system-ui)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Subtotal</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-mono, monospace)' }}>
                      ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status + Notes */}
              <div className="wf-mobile-modal-status-grid" style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, marginBottom: 24 }}>
                <div>
                  <label style={formLbl}>Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value as Estimate['status'])} style={formInp}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="approved">Approved</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
                <div>
                  <label style={formLbl}>Notes</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes…" style={formInp} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setModalOpen(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,.09)', background: '#111827', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={save} disabled={saving || !client.trim()}
                  style={{ padding: '9px 22px', borderRadius: 8, background: saving || !client.trim() ? '#111827' : 'var(--amber)', color: saving || !client.trim() ? 'var(--text4)' : '#080c1a', border: 'none', fontSize: 13, fontWeight: 800, cursor: saving || !client.trim() ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-display, system-ui)', letterSpacing: '.3px' }}>
                  {saving ? 'Saving…' : editTarget ? 'Update' : 'Create Estimate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
