'use client'

import { useState } from 'react'
import type { SessionUser } from '@/lib/auth'
import { useLang } from '@/components/LangProvider'
import { useIsMobile } from '@/lib/useIsMobile'
import type { TKeys } from '@/lib/i18n'

type Invoice = {
  id: string; number: string; client: string; total: number; status: string
  dueDate: string; labor: number; parts: number; surcharge: number
  job: { client: string; type: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--text3)', sent: '#5ba3f5', paid: 'var(--green)', overdue: 'var(--red)',
}

const TABS: TKeys[] = ['all', 'draft', 'sent', 'paid', 'overdue']

export default function InvoicesClient({ initialInvoices, session }: { initialInvoices: Invoice[]; session: SessionUser }) {
  const [invoices, setInvoices] = useState(initialInvoices)
  const [tab, setTab] = useState('all')
  const { t } = useLang()
  const isMobile = useIsMobile()

  const filtered = tab === 'all' ? invoices : invoices.filter(i => i.status === tab)

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    }
  }

  function ActionButtons({ inv, c }: { inv: Invoice; c: string }) {
    return (
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {inv.status === 'draft' && <button onClick={() => updateStatus(inv.id, 'sent')} style={{ background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '5px 10px', cursor: 'pointer' }}>{t('sendInvoice')}</button>}
        {inv.status === 'sent' && <button onClick={() => updateStatus(inv.id, 'paid')} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '5px 10px', cursor: 'pointer' }}>{t('markPaid')}</button>}
        {inv.status === 'overdue' && <button onClick={() => updateStatus(inv.id, 'sent')} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '5px 10px', cursor: 'pointer' }}>{t('remind')}</button>}
        <button onClick={() => window.open(`/api/invoices/${inv.id}/pdf`, '_blank')} style={{ background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '5px 10px', cursor: 'pointer' }}>{t('pdf')}</button>
      </div>
    )
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
                  <ActionButtons inv={inv} c={c} />
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
              <ActionButtons inv={inv} c={c} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
