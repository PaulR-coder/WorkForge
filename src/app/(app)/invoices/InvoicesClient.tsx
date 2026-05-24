'use client'

import { useState, useEffect } from 'react'
import type { SessionUser } from '@/lib/auth'
import { trackEvent } from '@/lib/posthog'
import { can } from '@/lib/permissions'
import { useLang } from '@/components/LangProvider'
import { useIsMobile } from '@/lib/useIsMobile'
import type { TKeys } from '@/lib/i18n'
import PaymentOverlay from '@/components/jobs/PaymentOverlay'

type Invoice = {
  id: string; number: string; client: string; clientEmail: string; total: number; status: string
  dueDate: string; labor: number; parts: number; surcharge: number; jobId?: string | null
  job: { client: string; type: string; scheduledAt: string | null; description: string } | null
  payments: { id: string; amount: number; method: string; createdAt: string }[]
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--text3)', sent: '#5ba3f5', paid: 'var(--green)', overdue: 'var(--red)',
}

const TABS: TKeys[] = ['all', 'draft', 'sent', 'paid', 'overdue', 'outstanding']

const inp: React.CSSProperties = {
  width: '100%', background: '#111827', border: '1px solid rgba(255,255,255,.09)', borderRadius: 8,
  color: 'var(--text)', fontSize: 13, padding: '9px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)',
  textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 5,
  fontFamily: 'var(--font-display, system-ui)',
}

// SVG icons — no emoji
function IconMail() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>
    </svg>
  )
}
function IconPDF() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}

function ActionButtons({ inv, c, loadingId, emailSendingId, onUpdateStatus, onEmailInvoice, t }: {
  inv: Invoice; c: string; loadingId: string | null; emailSendingId: string | null
  onUpdateStatus: (id: string, status: string) => void
  onEmailInvoice: (id: string, currentEmail: string) => void
  t: (k: TKeys) => string
}) {
  const busy = loadingId === inv.id
  const emailing = emailSendingId === inv.id
  const btnBase: React.CSSProperties = {
    border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700,
    padding: '5px 10px', cursor: busy ? 'wait' : 'pointer', flexShrink: 0,
    fontFamily: 'var(--font-display, system-ui)', letterSpacing: '.3px',
    minHeight: 44,
  }
  return (
    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
      {inv.status === 'draft' && (
        <button onClick={() => onUpdateStatus(inv.id, 'sent')} disabled={busy}
          style={{ ...btnBase, background: 'var(--amber)', color: '#080c1a', opacity: busy ? 0.6 : 1 }}>
          {busy ? '…' : t('sendInvoice')}
        </button>
      )}
      {inv.status === 'sent' && (
        <button onClick={() => onUpdateStatus(inv.id, 'paid')} disabled={busy}
          style={{ ...btnBase, background: 'var(--green)', color: '#fff', opacity: busy ? 0.6 : 1 }}>
          {busy ? '…' : t('markPaid')}
        </button>
      )}
      {inv.status === 'overdue' && (
        <button onClick={() => onUpdateStatus(inv.id, 'sent')} disabled={busy}
          style={{ ...btnBase, background: 'var(--red)', color: '#fff', opacity: busy ? 0.6 : 1 }}>
          {busy ? '…' : t('remind')}
        </button>
      )}
      <button onClick={() => onEmailInvoice(inv.id, inv.clientEmail ?? '')} disabled={emailing}
        style={{ ...btnBase, background: 'rgba(91,163,245,.15)', color: '#5ba3f5', border: '1px solid rgba(91,163,245,.25)', display: 'flex', alignItems: 'center', gap: 4, cursor: emailing ? 'wait' : 'pointer', opacity: emailing ? 0.6 : 1 }}>
        <IconMail />{emailing ? '…' : 'Email'}
      </button>
      <button onClick={() => window.open(`/api/invoices/${inv.id}/pdf`, '_blank')}
        style={{ ...btnBase, background: '#111827', color: 'var(--text3)', border: '1px solid rgba(255,255,255,.09)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
        <IconPDF />{t('pdf')}
      </button>
    </div>
  )
}

export default function InvoicesClient({
  initialInvoices,
  session,
  initialStatusFilter,
}: {
  initialInvoices: Invoice[]
  session: SessionUser
  initialStatusFilter?: string
}) {
  const [invoices, setInvoices] = useState(initialInvoices)
  const [tab, setTab] = useState(initialStatusFilter ?? 'all')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [emailPrompt, setEmailPrompt] = useState<{ id: string; current: string } | null>(null)
  const [emailSendingId, setEmailSendingId] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const { t } = useLang()
  const isMobile = useIsMobile()

  async function sendInvoiceEmail(id: string, email: string) {
    if (!email.trim()) return
    setEmailSendingId(id)
    setEmailPrompt(null)
    const res = await fetch(`/api/invoices/${id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientEmail: email }),
    })
    if (res.ok) {
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, clientEmail: email, status: i.status === 'draft' ? 'sent' : i.status } : i))
    }
    setEmailSendingId(null)
  }

  const canCreate = can(session.role, 'createInvoice')

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false)
  const [createClient, setCreateClient] = useState('')
  const [createJobId, setCreateJobId] = useState('')
  const [createLabor, setCreateLabor] = useState(0)
  const [createParts, setCreateParts] = useState(0)
  const [createSurcharge, setCreateSurcharge] = useState(0)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [jobs, setJobs] = useState<{ id: string; client: string; type: string }[]>([])

  useEffect(() => {
    if (createOpen) {
      fetch('/api/jobs').then(r => r.json()).then(d => { if (Array.isArray(d)) setJobs(d) })
    }
  }, [createOpen])

  const createTotal = createLabor + createParts + createSurcharge

  function resetCreateForm() {
    setCreateClient('')
    setCreateJobId('')
    setCreateLabor(0)
    setCreateParts(0)
    setCreateSurcharge(0)
    setCreateError('')
  }

  async function submitCreate() {
    if (!createClient.trim()) { setCreateError('Client name is required.'); return }
    setCreateLoading(true)
    setCreateError('')
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: createClient.trim(),
          jobId: createJobId || null,
          labor: createLabor,
          parts: createParts,
          surcharge: createSurcharge,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setCreateError(err.error ?? 'Failed to create invoice.')
        return
      }
      const created = await res.json()
      const normalized: Invoice = {
        ...created,
        dueDate: created.dueDate ? new Date(created.dueDate).toISOString() : new Date().toISOString(),
        job: null,
        payments: [],
      }
      setInvoices(prev => [normalized, ...prev])
      setCreateOpen(false)
      resetCreateForm()
    } finally {
      setCreateLoading(false)
    }
  }

  const displayed = invoices.filter(inv => {
    if (tab === 'all') return true
    if (tab === 'outstanding') return ['sent', 'overdue'].includes(inv.status)
    return inv.status === tab
  })

  async function updateStatus(id: string, status: string) {
    setLoadingId(id)
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoadingId(null)
    if (res.ok) {
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    }
  }

  // KPI summary stats
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const totalOutstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0)

  const kpiStyle: React.CSSProperties = {
    flex: 1, background: '#0a0f1e', border: '1px solid rgba(255,255,255,.09)',
    borderRadius: 10, padding: '12px 16px', minWidth: 0,
  }
  const kpiLabel: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase',
    letterSpacing: '.8px', marginBottom: 4, fontFamily: 'var(--font-display, system-ui)',
  }
  const kpiValue: React.CSSProperties = {
    fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1,
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '20px 24px', maxWidth: 1000 }}>
      <style>{`
        /* KPI strip: 2 columns on mobile */
        @media (max-width: 639px) {
          .wf-mobile-kpi-strip {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
          }
        }
        /* Create/edit modal: single column on mobile */
        @media (max-width: 639px) {
          .wf-mobile-billing-grid {
            grid-template-columns: 1fr !important;
          }
        }
        /* Action buttons: ensure touch targets */
        @media (max-width: 639px) {
          .wf-mobile-action-row {
            flex-wrap: wrap !important;
          }
        }
      `}</style>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'var(--font-display, system-ui)', letterSpacing: '-.2px' }}>
            {t('invoicesTitle')}
          </h1>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 3 }}>
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} &middot; {invoices.filter(i => i.status === 'paid').length} paid &middot; {invoices.filter(i => i.status === 'overdue').length} overdue
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setCreateOpen(true)}
            style={{ padding: '8px 16px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0, fontFamily: 'var(--font-display, system-ui)', letterSpacing: '.3px' }}
          >
            + New Invoice
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div className="wf-mobile-kpi-strip" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        <div style={kpiStyle}>
          <div style={kpiLabel}>Total Invoiced</div>
          <div style={{ ...kpiValue, color: 'var(--text)' }}>${totalInvoiced.toLocaleString()}</div>
        </div>
        <div style={kpiStyle}>
          <div style={kpiLabel}>Total Paid</div>
          <div style={{ ...kpiValue, color: 'var(--green)' }}>${totalPaid.toLocaleString()}</div>
        </div>
        <div style={kpiStyle}>
          <div style={kpiLabel}>Outstanding</div>
          <div style={{ ...kpiValue, color: totalOutstanding > 0 ? 'var(--amber)' : 'var(--text3)' }}>${totalOutstanding.toLocaleString()}</div>
        </div>
      </div>

      {/* Tab pills + count */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2 } as React.CSSProperties}>
        {TABS.map(tabKey => {
          const count = tabKey === 'all' ? invoices.length : invoices.filter(i => i.status === tabKey).length
          const active = tab === tabKey
          return (
            <button key={tabKey} onClick={() => setTab(tabKey)}
              style={{
                padding: '6px 13px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                border: active ? 'none' : '1px solid rgba(255,255,255,.09)',
                background: active ? 'var(--amber)' : '#111827',
                color: active ? '#080c1a' : 'var(--text3)',
                whiteSpace: 'nowrap', flexShrink: 0,
                fontFamily: 'var(--font-display, system-ui)', letterSpacing: '.3px',
                transition: 'background .15s, color .15s',
              }}>
              {t(tabKey)}
              {tabKey !== 'all' && count > 0 && (
                <span style={{ marginLeft: 5, opacity: active ? 0.7 : 0.5 }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Invoice list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {displayed.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text4)', fontSize: 13 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ display: 'block', margin: '0 auto 12px', opacity: .3 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            {t('noInvoices')}
          </div>
        )}

        {displayed.map(inv => {
          const c = STATUS_COLORS[inv.status] ?? 'var(--text)'
          const due = new Date(inv.dueDate)
          const overdueDays = inv.status === 'overdue' ? Math.ceil((Date.now() - due.getTime()) / 86400000) : 0

          if (isMobile) {
            return (
              <div key={inv.id} onClick={() => { setSelectedInvoice(inv); setShowPayment(false) }} style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,.09)', borderRadius: 12, padding: '14px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1, marginRight: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{inv.client}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--font-mono, monospace)' }}>
                      {inv.number}
                    </div>
                    <div style={{ fontSize: 10, color: overdueDays > 0 ? 'var(--red)' : 'var(--text4)', marginTop: 2, fontFamily: 'var(--font-mono, monospace)' }}>
                      Due {due.toLocaleDateString()}
                      {overdueDays > 0 && <span style={{ fontWeight: 700 }}> · {overdueDays}d overdue</span>}
                    </div>
                    {inv.job && (
                      <span style={{ display: 'inline-block', marginTop: 4, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'rgba(167,139,250,.12)', color: '#a78bfa', letterSpacing: '.3px' }}>{inv.job.type}</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: c, fontFamily: 'var(--font-mono, monospace)', marginBottom: 5 }}>${inv.total.toLocaleString()}</div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: `${c}18`, color: c, border: `1px solid ${c}30`, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                      {t(inv.status as TKeys)}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                  <ActionButtons inv={inv} c={c} loadingId={loadingId} emailSendingId={emailSendingId} onUpdateStatus={updateStatus} onEmailInvoice={(id, email) => setEmailPrompt({ id, current: email })} t={t} />
                </div>
              </div>
            )
          }

          return (
            <div key={inv.id} onClick={() => { setSelectedInvoice(inv); setShowPayment(false) }} style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,.09)', borderRadius: 10, padding: '11px 16px', display: 'grid', alignItems: 'center', gap: 12, gridTemplateColumns: '80px 1fr auto auto auto auto', cursor: 'pointer' }}>
              {/* Invoice number */}
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', fontFamily: 'var(--font-mono, monospace)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.number}</div>

              {/* Client + job type */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.client}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {inv.job && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: 'rgba(167,139,250,.12)', color: '#a78bfa', letterSpacing: '.3px' }}>{inv.job.type}</span>
                  )}
                </div>
              </div>

              {/* Due date */}
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: overdueDays > 0 ? 'var(--red)' : 'var(--text4)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {due.toLocaleDateString()}
                {overdueDays > 0 && <div style={{ fontSize: 9, fontWeight: 700 }}>{overdueDays}d late</div>}
              </div>

              {/* Amount */}
              <div style={{ fontSize: 15, fontWeight: 800, color: c, fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap', flexShrink: 0 }}>${inv.total.toLocaleString()}</div>

              {/* Status badge */}
              <span style={{ fontSize: 9, fontWeight: 700, padding: '4px 9px', borderRadius: 20, background: `${c}16`, color: c, border: `1px solid ${c}28`, textTransform: 'uppercase', letterSpacing: '.6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {t(inv.status as TKeys)}
              </span>

              {/* Actions */}
              <ActionButtons inv={inv} c={c} loadingId={loadingId} emailSendingId={emailSendingId} onUpdateStatus={updateStatus} onEmailInvoice={(id, email) => setEmailPrompt({ id, current: email })} t={t} />
            </div>
          )
        })}
      </div>

      {/* Create Invoice Modal */}
      {createOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setCreateOpen(false); resetCreateForm() } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 0 : 16, overflowY: 'auto' }}
        >
          <div style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,.09)', borderRadius: 16, width: '100%', maxWidth: isMobile ? '100%' : 'min(480px,90vw)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.7)' }}>
            {/* Amber top border strip */}
            <div style={{ height: 3, background: 'linear-gradient(90deg, var(--amber), #f97316)' }} />
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-display, system-ui)', letterSpacing: '-.1px' }}>New Invoice</div>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 3 }}>Fill in the details below to generate a new invoice.</div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Client Name</label>
                <input
                  value={createClient}
                  onChange={e => setCreateClient(e.target.value)}
                  placeholder="Client name"
                  style={inp}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Linked Job (optional)</label>
                <select
                  value={createJobId}
                  onChange={e => setCreateJobId(e.target.value)}
                  style={inp}
                >
                  <option value="">— No linked job —</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.client} — {j.type}</option>
                  ))}
                </select>
              </div>

              {/* Billing fields row */}
              <div className="wf-mobile-billing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Labor $</label>
                  <input type="number" min={0} value={createLabor} onChange={e => setCreateLabor(Number(e.target.value))} style={{ ...inp, fontFamily: 'var(--font-mono, monospace)' }} />
                </div>
                <div>
                  <label style={lbl}>Parts $</label>
                  <input type="number" min={0} value={createParts} onChange={e => setCreateParts(Number(e.target.value))} style={{ ...inp, fontFamily: 'var(--font-mono, monospace)' }} />
                </div>
                <div>
                  <label style={lbl}>Surcharge $</label>
                  <input type="number" min={0} value={createSurcharge} onChange={e => setCreateSurcharge(Number(e.target.value))} style={{ ...inp, fontFamily: 'var(--font-mono, monospace)' }} />
                </div>
              </div>

              {/* Total */}
              <div style={{ marginBottom: 20, padding: '12px 16px', background: '#060a17', borderRadius: 9, border: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'var(--font-display, system-ui)' }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-mono, monospace)' }}>${createTotal.toLocaleString()}</span>
              </div>

              {createError && (
                <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--red)', fontWeight: 600, padding: '8px 12px', background: 'rgba(239,68,68,.08)', borderRadius: 7, border: '1px solid rgba(239,68,68,.2)' }}>{createError}</div>
              )}

              <button
                onClick={submitCreate}
                disabled={createLoading}
                style={{ width: '100%', padding: '12px 0', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: createLoading ? 'wait' : 'pointer', opacity: createLoading ? 0.7 : 1, marginBottom: 8, fontFamily: 'var(--font-display, system-ui)', letterSpacing: '.3px' }}
              >
                {createLoading ? 'Saving…' : 'Create Invoice'}
              </button>
              <button
                onClick={() => { setCreateOpen(false); resetCreateForm() }}
                style={{ width: '100%', padding: '10px 0', background: 'transparent', color: 'var(--text3)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 9, fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Panel */}
      {selectedInvoice && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setSelectedInvoice(null); setShowPayment(false) } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-end' : 'center', padding: isMobile ? 0 : 16 }}
        >
          <div style={{
            background: '#0a0f1e', border: '1px solid rgba(255,255,255,.09)',
            borderRadius: isMobile ? '20px 20px 0 0' : 16,
            width: '100%', maxWidth: isMobile ? '100%' : 480,
            maxHeight: isMobile ? '92vh' : '88vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,.7)',
          }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, var(--amber), #f97316)' }} />
            <div style={{ padding: 24 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text4)', fontFamily: 'var(--font-mono, monospace)', marginBottom: 4 }}>{selectedInvoice.number}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.1px' }}>{selectedInvoice.client}</div>
                  {selectedInvoice.clientEmail && (
                    <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{selectedInvoice.clientEmail}</div>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedInvoice(null); setShowPayment(false) }}
                  style={{ background: '#111827', border: '1px solid rgba(255,255,255,.09)', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: 'var(--text4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Scheduled date */}
              {selectedInvoice.job?.scheduledAt && (
                <div style={{ background: 'var(--bg3, #111827)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>📅</span>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Service Scheduled</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
                      {new Date(selectedInvoice.job.scheduledAt).toLocaleString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit', hour12: true,
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Totals breakdown */}
              <div style={{ background: '#060a17', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: '1px solid rgba(255,255,255,.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text4)' }}>Labor</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', fontFamily: 'var(--font-mono, monospace)' }}>${selectedInvoice.labor.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text4)' }}>Parts</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', fontFamily: 'var(--font-mono, monospace)' }}>${selectedInvoice.parts.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text4)' }}>Surcharge</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', fontFamily: 'var(--font-mono, monospace)' }}>${selectedInvoice.surcharge.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.07)' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Total</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: STATUS_COLORS[selectedInvoice.status] ?? 'var(--text)', fontFamily: 'var(--font-mono, monospace)' }}>${selectedInvoice.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Due date + status */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, background: '#111827', borderRadius: 9, padding: '10px 12px', border: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 3 }}>Due Date</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', fontFamily: 'var(--font-mono, monospace)' }}>{new Date(selectedInvoice.dueDate).toLocaleDateString()}</div>
                </div>
                <div style={{ flex: 1, background: '#111827', borderRadius: 9, padding: '10px 12px', border: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 3 }}>Status</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${STATUS_COLORS[selectedInvoice.status] ?? 'var(--text)'}18`, color: STATUS_COLORS[selectedInvoice.status] ?? 'var(--text)', border: `1px solid ${STATUS_COLORS[selectedInvoice.status] ?? 'var(--text)'}30`, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    {t(selectedInvoice.status as TKeys)}
                  </span>
                </div>
              </div>

              {/* Inline payment */}
              {['draft', 'sent', 'overdue'].includes(selectedInvoice.status) && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.07)' }}>
                  {!showPayment ? (
                    <button
                      type="button"
                      onClick={() => setShowPayment(true)}
                      style={{ width: '100%', padding: '12px 0', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-display, system-ui)', letterSpacing: '.3px' }}
                    >
                      💳 Collect Payment — ${selectedInvoice.total?.toLocaleString()}
                    </button>
                  ) : null}
                </div>
              )}

              {/* Payment history */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '1.1px', marginBottom: 8 }}>Payment History</div>
                  {selectedInvoice.payments.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                      <span style={{ fontSize: 14 }}>💳</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'capitalize' }}>{p.method}</div>
                        <div style={{ fontSize: 11, color: 'var(--text4)' }}>{new Date(p.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>${p.amount.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PaymentOverlay — rendered outside detail panel so it overlays correctly */}
      {showPayment && selectedInvoice && (
        <PaymentOverlay
          jobId={selectedInvoice.jobId ?? undefined}
          clientName={selectedInvoice.client}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false)
            fetch('/api/invoices').then(r => r.json()).then(data => {
              if (Array.isArray(data)) {
                setInvoices(data)
                // refresh the selected invoice from new data
                const updated = (data as Invoice[]).find(i => i.id === selectedInvoice.id)
                if (updated) setSelectedInvoice(updated)
              }
            }).catch(() => {})
          }}
        />
      )}

      {/* Email invoice prompt */}
      {emailPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setEmailPrompt(null) }}>
          <div style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,.09)', borderRadius: 14, overflow: 'hidden', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,.7)' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #5ba3f5, #818cf8)' }} />
            <div style={{ padding: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 6, fontFamily: 'var(--font-display, system-ui)' }}>Email Invoice</h3>
              <p style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 16 }}>Enter the client&apos;s email to send the invoice.</p>
              <input
                id="inv-email-input"
                type="email"
                autoFocus
                defaultValue={emailPrompt.current}
                placeholder="client@example.com"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.09)', background: '#111827', color: 'var(--text)', fontSize: 13, marginBottom: 14, boxSizing: 'border-box', fontFamily: 'var(--font-mono, monospace)' }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const input = document.getElementById('inv-email-input') as HTMLInputElement
                    sendInvoiceEmail(emailPrompt.id, input.value)
                  }
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEmailPrompt(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,.09)', background: '#111827', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={() => {
                    const input = document.getElementById('inv-email-input') as HTMLInputElement
                    sendInvoiceEmail(emailPrompt.id, input.value)
                  }}
                  style={{ flex: 2, padding: '9px 0', borderRadius: 8, background: '#5ba3f5', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display, system-ui)' }}
                >
                  Send Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
