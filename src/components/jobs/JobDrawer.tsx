'use client'

import { useState, useEffect, useRef } from 'react'
import type { SessionUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { useLang } from '@/components/LangProvider'
import { useIsMobile } from '@/lib/useIsMobile'
import type { TKeys } from '@/lib/i18n'

type Message = {
  id: string
  body: string
  createdAt: string
  author: { name: string; initials: string; role: string }
}

type DetailJob = {
  id: string
  client: string
  address: string
  description: string
  type: string
  priority: string
  status: string
  createdAt: string
  completedAt: string | null
  tech: { id: string; name: string; initials: string } | null
  invoices: { id: string; number: string; total: number; status: string }[]
  equipment: { id: string; name: string; brand: string; icon: string }[]
  messages: Message[]
}

type User = { id: string; name: string; initials: string; role: string }

const STATUS_STEPS: { key: string; labelKey: TKeys; color: string }[] = [
  { key: 'open',        labelKey: 'open',        color: '#5ba3f5' },
  { key: 'scheduled',   labelKey: 'scheduled',   color: 'var(--amber)' },
  { key: 'in_progress', labelKey: 'inProgress',  color: 'var(--purple)' },
  { key: 'done',        labelKey: 'done',        color: 'var(--green)' },
]

const PRIORITY_COLOR: Record<string, string> = {
  low: 'var(--text4)', normal: '#5ba3f5', high: 'var(--amber)', urgent: 'var(--red)',
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'var(--purple)', admin: 'var(--amber)', dispatcher: '#5ba3f5',
  tech: 'var(--green)', readonly: 'var(--text3)',
}

export default function JobDrawer({
  jobId,
  users,
  session,
  onClose,
  onJobUpdate,
  onOpenPayment,
}: {
  jobId: string
  users: User[]
  session: SessionUser
  onClose: () => void
  onJobUpdate: (updated: { id: string; status: string; tech: { id: string; name: string; initials: string } | null }) => void
  onOpenPayment: (jobId: string, client: string) => void
}) {
  const [job, setJob] = useState<DetailJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  const [editingTech, setEditingTech] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const msgInputRef = useRef<HTMLInputElement>(null)
  const { t } = useLang()
  const isMobile = useIsMobile()

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then(r => r.json())
      .then(data => { setJob(data); setLoading(false) })
  }, [jobId])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [job?.messages])

  async function updateStatus(status: string) {
    if (!job) return
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setJob(prev => prev ? { ...prev, status: updated.status, completedAt: updated.completedAt } : null)
      onJobUpdate({ id: job.id, status: updated.status, tech: updated.tech })
    }
  }

  async function updateTech(techId: string) {
    if (!job) return
    const tech = users.find(u => u.id === techId) ?? null
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ techId: techId || null }),
    })
    if (res.ok) {
      setJob(prev => prev ? { ...prev, tech: tech ? { id: tech.id, name: tech.name, initials: tech.initials } : null } : null)
      onJobUpdate({ id: job.id, status: job.status, tech: tech ? { id: tech.id, name: tech.name, initials: tech.initials } : null })
    }
    setEditingTech(false)
  }

  async function sendMessage() {
    if (!job || !msgText.trim()) return
    setSending(true)
    const res = await fetch(`/api/jobs/${job.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: msgText.trim() }),
    })
    if (res.ok) {
      const msg = await res.json()
      setJob(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : null)
      setMsgText('')
    }
    setSending(false)
    msgInputRef.current?.focus()
  }

  const drawerWidth = isMobile ? '100vw' : 460

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }} onClick={onClose} />
      <div style={{ width: drawerWidth, background: 'var(--bg2)', borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text4)', fontSize: 12 }}>
        {t('loading')}
      </div>
    </div>
  )

  if (!job) return null

  const currentStep = STATUS_STEPS.findIndex(s => s.key === job.status)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }} onClick={onClose} />

      {/* Drawer */}
      <div style={{ width: drawerWidth, background: 'var(--bg2)', borderLeft: isMobile ? 'none' : '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, animation: 'slideIn .25s ease', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3, marginBottom: 4 }}>{job.client}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: 'var(--text4)' }}>{job.type}</span>
                <span style={{ fontSize: 10, color: 'var(--text4)' }}>·</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLOR[job.priority], background: `${PRIORITY_COLOR[job.priority]}18`, padding: '2px 7px', borderRadius: 10 }}>
                  {t(job.priority as TKeys)}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text4)' }}>·</span>
                <span style={{ fontSize: 10, color: 'var(--text4)' }}>{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text4)', padding: 4, lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px' }}>

          {/* Status pipeline */}
          <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>{t('status')}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {STATUS_STEPS.map((step, i) => {
                const active = job.status === step.key
                const past = i < currentStep
                return (
                  <button key={step.key}
                    disabled={!can(session.role, 'editJob')}
                    onClick={() => can(session.role, 'editJob') && updateStatus(step.key)}
                    style={{ flex: 1, padding: '7px 4px', borderRadius: 7, border: `1px solid ${active ? step.color : past ? `${step.color}40` : 'var(--border)'}`, background: active ? `${step.color}18` : 'transparent', color: active ? step.color : past ? `${step.color}80` : 'var(--text4)', fontSize: 10, fontWeight: 700, cursor: can(session.role, 'editJob') ? 'pointer' : 'default', transition: 'all .15s' }}>
                    {t(step.labelKey)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Job info */}
          <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{t('fullAddress')}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{job.address}</div>
            </div>
            {job.description && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{t('description')}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{job.description}</div>
              </div>
            )}
          </div>

          {/* Assigned tech */}
          <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: editingTech ? 10 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', flex: 1 }}>{t('assignedTech')}</div>
              {can(session.role, 'assignTech') && (
                <button onClick={() => setEditingTech(e => !e)} style={{ fontSize: 10, color: 'var(--amber)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  {editingTech ? t('cancel') : t('change')}
                </button>
              )}
            </div>
            {editingTech ? (
              <select
                defaultValue={job.tech?.id ?? ''}
                onChange={e => updateTech(e.target.value)}
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '8px 10px', outline: 'none' }}>
                <option value="">{t('unassigned')}</option>
                {users.filter(u => u.role === 'tech').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            ) : (
              job.tech ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--amber)', color: '#080c1a', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {job.tech.initials}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{job.tech.name}</span>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 6 }}>{t('unassigned')}</div>
              )
            )}
          </div>

          {/* Linked invoices */}
          {job.invoices.length > 0 && (
            <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>{t('linkedInvoices')}</div>
              {job.invoices.map(inv => {
                const c: Record<string, string> = { draft: 'var(--text3)', sent: '#5ba3f5', paid: 'var(--green)', overdue: 'var(--red)' }
                const col = c[inv.status] ?? 'var(--text)'
                return (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', flex: 1 }}>{inv.number}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: col }}>${inv.total.toLocaleString()}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: col, background: `${col}18`, padding: '2px 7px', borderRadius: 20, border: `1px solid ${col}33` }}>{t(inv.status as TKeys)}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Linked equipment */}
          {job.equipment.length > 0 && (
            <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>{t('linkedEquipment')}</div>
              {job.equipment.map(eq => (
                <div key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                  <span style={{ fontSize: 16 }}>{eq.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>{eq.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)' }}>{eq.brand}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Internal chat */}
          <div style={{ padding: '14px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
              {t('internalMessages')}
            </div>
            <div ref={chatRef} style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {job.messages.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text4)', textAlign: 'center', padding: '16px 0' }}>{t('noMessages')}</div>
              )}
              {job.messages.map(msg => {
                const isMe = msg.author.name === session.name
                const roleColor = ROLE_COLORS[msg.author.role] ?? 'var(--text3)'
                return (
                  <div key={msg.id} style={{ display: 'flex', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: roleColor, color: '#080c1a', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {msg.author.initials}
                    </div>
                    <div style={{ maxWidth: '75%' }}>
                      <div style={{ fontSize: 10, color: 'var(--text4)', marginBottom: 3, textAlign: isMe ? 'right' : 'left' }}>
                        {msg.author.name} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ background: isMe ? 'rgba(245,158,11,.12)' : 'var(--bg3)', border: `1px solid ${isMe ? 'rgba(245,158,11,.25)' : 'var(--border)'}`, borderRadius: isMe ? '10px 10px 2px 10px' : '10px 10px 10px 2px', padding: '7px 10px', fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>
                        {msg.body}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                ref={msgInputRef}
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={t('typeMessage')}
                style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '8px 10px', outline: 'none', fontFamily: 'inherit' }}
              />
              <button onClick={sendMessage} disabled={sending || !msgText.trim()}
                style={{ background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, padding: '8px 12px', cursor: 'pointer', opacity: (!msgText.trim() || sending) ? 0.5 : 1 }}>
                {t('send')}
              </button>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6, flexShrink: 0 }}>
          {can(session.role, 'collectPayment') && (
            <button onClick={() => onOpenPayment(job.id, job.client)}
              style={{ flex: 1, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, padding: '10px 0', cursor: 'pointer' }}>
              {t('collectPayment')}
            </button>
          )}
          {can(session.role, 'editJob') && job.status !== 'done' && (
            <button onClick={() => updateStatus('done')}
              style={{ flex: 1, background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, padding: '10px 0', cursor: 'pointer' }}>
              {t('markComplete')}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
