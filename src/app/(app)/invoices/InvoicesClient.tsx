'use client'

import { useState, useEffect } from 'react'
import type { SessionUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { useLang } from '@/components/LangProvider'
import { useIsMobile } from '@/lib/useIsMobile'
import type { TKeys } from '@/lib/i18n'

type Invoice = {
  id: string; number: string; client: string; clientEmail: string; total: number; status: string
  dueDate: string; labor: number; parts: number; surcharge: number
  job: { client: string; type: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--text3)', sent: '#5ba3f5', paid: 'var(--green)', overdue: 'var(--red)',
}

const TABS: TKeys[] = ['all', 'draft', 'sent', 'paid', 'overdue']

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text)', fontSize: 13, padding: '9px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)',
  textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4,
}

function ActionButtons({ inv, c, loadingId, emailSendingId, onUpdateStatus, onEmailInvoice, t }: {
  inv: Invoice; c: string; loadingId: string | null; emailSendingId: string | null
  onUpdateStatus: (id: string, status: string) => void
  onEmailInvoice: (id: string, currentEmail: string) => void
  t: (k: TKeys) => string
}) {
  const busy = loadingId === inv.id
  const emailing = emailSendingId === inv.id
  return (
    <div style={{ display: 'flex', gap: 5, flexShrink: 0, flexWrap: 'wrap' }}>
      {inv.status === 'draft' && <button onClick={() => onUpdateStatus(inv.id, 'sent')} disabled={busy} style={{ background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '5px 10px', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? '…' : t('sendInvoice')}</button>}
      {inv.status === 'sent' && <button onClick={() => onUpdateStatus(inv.id, 'paid')} disabled={busy} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '5px 10px', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? '…' : t('markPaid')}</button>}
      {inv.status === 'overdue' && <button onClick={() => onUpdateStatus(inv.id, 'sent')} disabled={busy} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '5px 10px', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? '…' : t('remind')}</button>}
      <button onClick={() => onEmailInvoice(inv.id, inv.clientEmail ?? '')} disabled={emailing} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '5px 10px', cursor: emailing ? 'wait' : 'pointer', opacity: emailing ? 0.6 : 1 }}>
        {emailing ? '…' : '📧 Email'}
      </button>
      <button onClick={() => window.open(`/api/invoices/${inv.id}/pdf`, '_blank')} style={{ background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '5px 10px', cursor: 'pointer' }}>{t('pdf')}</button>
    </div>
  )
}

export default function InvoicesClient({ initialInvoices, session }: { initialInvoices: Invoice[]; session: SessionUser }) {
  const [invoices, setInvoices] = useState(initialInvoices)
  const [tab, setTab] = useState('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [emailPrompt, setEmailPrompt] = useState<{ id: string; current: string } | null>(null)
  const [emailSendingId, setEmailSendingId] = useState<string | null>(null)
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
      }
      setInvoices(prev => [normalized, ...prev])
      setCreateOpen(false)
      resetCreateForm()
    } finally {
      setCreateLoading(false)
    }
  }

  const filtered = tab === 'all' ? invoices : invoices.filter(i => i.status === tab)

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

  return (
    <div className="page-padding" style={{ padding: 20 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', flexShrink: 0 }}>{t('invoicesTitle')}</h1>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2, flexShrink: 0, maxWidth: isMobile ? '100%' : undefined } as React.CSSProperties}>
          {TABS.map(tabKey => (
            <button key={tabKey} onClick={() => setTab(tabKey)}
              style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid var(--border)', background: tab === tabKey ? 'var(--amber)' : 'var(--bg3)', color: tab === tabKey ? '#080c1a' : 'var(--text3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {t(tabKey)}
              {tabKey !== 'all' && <span style={{ marginLeft: 5 }}>{invoices.filter(i => i.status === tabKey).length}</span>}
            </button>
          ))}
        </div>
        {canCreate && (
          <button
            onClick={() => setCreateOpen(true)}
            style={{ marginLeft: 'auto', padding: '7px 14px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            + New Invoice
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text4)' }}>{t('noInvoices')}</div>
        )}

        {filtered.map(inv => {
          const c = STATUS_COLORS[inv.status] ?? 'var(--text)'
          const due = new Date(inv.dueDate)
          const overdueDays = inv.status === 'overdue' ? Math.ceil((Date.now() - due.getTime()) / 86400000) : 0

          if (isMobile) {
            return (
              <div key={inv.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1, marginRight: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{inv.client}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>
                      {inv.number} · Due {due.toLocaleDateString()}
                      {overdueDays > 0 && <span style={{ color: 'var(--red)', fontWeight: 700 }}> · {overdueDays}d overdue</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: c }}>${inv.total.toLocaleString()}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${c}18`, color: c, border: `1px solid ${c}33` }}>
                      {t(inv.status as TKeys)}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <ActionButtons inv={inv} c={c} loadingId={loadingId} emailSendingId={emailSendingId} onUpdateStatus={updateStatus} onEmailInvoice={(id, email) => setEmailPrompt({ id, current: email })} t={t} />
                </div>
              </div>
            )
          }

          return (
            <div key={inv.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', minWidth: 70 }}>{inv.number}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{inv.client}</div>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>
                  {inv.job ? `${inv.job.type} Service · ` : ''}Due {due.toLocaleDateString()}
                  {overdueDays > 0 && <span style={{ color: 'var(--red)', fontWeight: 700 }}> · {overdueDays} {t('daysOverdue')}</span>}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: c }}>${inv.total.toLocaleString()}</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: `${c}18`, color: c, border: `1px solid ${c}33` }}>
                {t(inv.status as TKeys)}
              </span>
              <ActionButtons inv={inv} c={c} loadingId={loadingId} emailSendingId={emailSendingId} onUpdateStatus={updateStatus} onEmailInvoice={(id, email) => setEmailPrompt({ id, current: email })} t={t} />
            </div>
          )
        })}
      </div>

      {/* Create Invoice Modal */}
      {createOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setCreateOpen(false); resetCreateForm() } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 'min(480px,90vw)', padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 20 }}>New Invoice</div>

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

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Labor $</label>
              <input
                type="number"
                min={0}
                value={createLabor}
                onChange={e => setCreateLabor(Number(e.target.value))}
                style={inp}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Parts $</label>
              <input
                type="number"
                min={0}
                value={createParts}
                onChange={e => setCreateParts(Number(e.target.value))}
                style={inp}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Surcharge $</label>
              <input
                type="number"
                min={0}
                value={createSurcharge}
                onChange={e => setCreateSurcharge(Number(e.target.value))}
                style={inp}
              />
            </div>

            <div style={{ marginBottom: 20, padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text4)' }}>TOTAL</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>${createTotal.toLocaleString()}</span>
            </div>

            {createError && (
              <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>{createError}</div>
            )}

            <button
              onClick={submitCreate}
              disabled={createLoading}
              style={{ width: '100%', padding: '11px 0', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: createLoading ? 'wait' : 'pointer', opacity: createLoading ? 0.7 : 1, marginBottom: 8 }}
            >
              {createLoading ? 'Saving…' : 'Create Invoice'}
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

      {/* Email invoice prompt */}
      {emailPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setEmailPrompt(null) }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 400 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Email Invoice</h3>
            <p style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 16 }}>Enter the client&apos;s email to send the invoice.</p>
            <input
              id="inv-email-input"
              type="email"
              autoFocus
              defaultValue={emailPrompt.current}
              placeholder="client@example.com"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, marginBottom: 14, boxSizing: 'border-box' }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const input = document.getElementById('inv-email-input') as HTMLInputElement
                  sendInvoiceEmail(emailPrompt.id, input.value)
                }
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEmailPrompt(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={() => {
                  const input = document.getElementById('inv-email-input') as HTMLInputElement
                  sendInvoiceEmail(emailPrompt.id, input.value)
                }}
                style={{ flex: 2, padding: '9px 0', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Send Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
