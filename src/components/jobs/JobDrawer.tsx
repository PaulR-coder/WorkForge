'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { SessionUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { useLang } from '@/components/LangProvider'
import { useIsMobile } from '@/lib/useIsMobile'
import type { TKeys } from '@/lib/i18n'
import { useToast } from '@/components/Toast'
import { DrawerSkeleton } from '@/components/Skeleton'

type Message = {
  id: string
  body: string
  createdAt: string
  author: { name: string; initials: string; role: string }
}

type Photo = {
  id: string
  data: string
  createdAt: string
  author: { name: string; initials: string }
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
  scheduledAt: string | null
  completedAt: string | null
  archivedAt: string | null
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
  tech: 'var(--green)',
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
  onJobUpdate: (updated: { id: string; status: string; tech: { id: string; name: string; initials: string } | null; archived?: boolean }) => void
  onOpenPayment: (jobId: string, client: string) => void
}) {
  const [job, setJob] = useState<DetailJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  const [editingTech, setEditingTech] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [editForm, setEditForm] = useState({ client: '', address: '', type: '', priority: '', description: '' })
  const [savingDetails, setSavingDetails] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [showInvoicePrompt, setShowInvoicePrompt] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const msgInputRef = useRef<HTMLInputElement>(null)
  const { t } = useLang()
  const isMobile = useIsMobile()
  const { toast } = useToast()

  useEffect(() => {
    setLoading(true)
    setLoadError(false)
    fetch(`/api/jobs/${jobId}`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json() })
      .then(data => { setJob(data); setLoading(false) })
      .catch(() => { setLoadError(true); setLoading(false) })
    fetch(`/api/jobs/${jobId}/photos`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPhotos(data) })
      .catch(() => {})
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
      toast(`Job marked ${status === 'done' ? 'complete' : status.replace('_', ' ')}`, 'success')
      if (status === 'done') setShowInvoicePrompt(true)
    } else {
      toast('Failed to update status', 'error')
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
      toast(tech ? `Assigned to ${tech.name}` : 'Tech unassigned', 'success')
    } else {
      toast('Failed to assign tech', 'error')
    }
    setEditingTech(false)
  }

  async function updateScheduledAt(value: string) {
    if (!job) return
    const scheduledAt = value ? new Date(value).toISOString() : null
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduledAt,
        ...(scheduledAt ? { status: 'scheduled' } : {}),
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setJob(prev => prev ? { ...prev, scheduledAt: updated.scheduledAt ?? null, status: updated.status } : null)
      onJobUpdate({ id: job.id, status: updated.status, tech: updated.tech })
    }
  }

  function openEditDetails() {
    if (!job) return
    setEditForm({ client: job.client, address: job.address, type: job.type, priority: job.priority, description: job.description ?? '' })
    setEditingDetails(true)
  }

  async function saveDetails() {
    if (!job) return
    setSavingDetails(true)
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      const updated = await res.json()
      setJob(prev => prev ? { ...prev, client: updated.client, address: updated.address, type: updated.type, priority: updated.priority, description: updated.description ?? '' } : null)
      onJobUpdate({ id: job.id, status: job.status, tech: job.tech })
      setEditingDetails(false)
      toast('Details saved', 'success')
    } else {
      toast('Failed to save details', 'error')
    }
    setSavingDetails(false)
  }

  async function archiveJob() {
    if (!job) return
    setArchiving(true)
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archive' }),
    })
    if (res.ok) {
      toast('Job archived — find it in Job History', 'info')
      onJobUpdate({ id: job.id, status: job.status, tech: job.tech, archived: true })
      onClose()
    } else {
      toast('Failed to archive job', 'error')
    }
    setArchiving(false)
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
    } else {
      toast('Failed to send message', 'error')
    }
    setSending(false)
    msgInputRef.current?.focus()
  }

  const drawerWidth = isMobile ? '100vw' : 460

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }} onClick={onClose} />
      <div style={{ width: drawerWidth, background: 'var(--bg2)', borderLeft: isMobile ? 'none' : '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text4)', padding: 4 }}>✕</button>
        </div>
        <DrawerSkeleton />
      </div>
    </div>
  )

  if (loadError) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }} onClick={onClose} />
      <div style={{ width: drawerWidth, background: 'var(--bg2)', borderLeft: isMobile ? 'none' : '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
        <div style={{ fontSize: 36 }}>⚠️</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>Failed to load job</div>
        <div style={{ fontSize: 12, color: 'var(--text4)', textAlign: 'center' }}>Check your connection and try again.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '9px 16px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Close</button>
          <button
            onClick={() => { setLoadError(false); setLoading(true); fetch(`/api/jobs/${jobId}`).then(r => r.json()).then(data => { setJob(data); setLoading(false) }).catch(() => { setLoadError(true); setLoading(false) }) }}
            style={{ padding: '9px 16px', background: 'var(--amber)', border: 'none', borderRadius: 8, color: '#080c1a', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
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
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ flex: 1, fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Details</div>
              {can(session.role, 'editJob') && !editingDetails && (
                <button onClick={openEditDetails} style={{ fontSize: 10, color: 'var(--amber)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Edit</button>
              )}
            </div>
            {editingDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Client', key: 'client', type: 'text' },
                  { label: 'Address', key: 'address', type: 'text' },
                  { label: 'Type', key: 'type', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', marginBottom: 3 }}>{f.label}</div>
                    <input
                      value={editForm[f.key as keyof typeof editForm]}
                      onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '7px 10px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', marginBottom: 3 }}>Priority</div>
                  <select
                    value={editForm.priority}
                    onChange={e => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '7px 10px', outline: 'none' }}
                  >
                    {['low', 'normal', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', marginBottom: 3 }}>Description</div>
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '7px 10px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setEditingDetails(false)} style={{ flex: 1, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text3)', fontSize: 12, fontWeight: 700, padding: '8px 0', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={saveDetails} disabled={savingDetails} style={{ flex: 2, background: 'var(--amber)', border: 'none', borderRadius: 8, color: '#080c1a', fontSize: 12, fontWeight: 700, padding: '8px 0', cursor: 'pointer', opacity: savingDetails ? 0.6 : 1 }}>
                    {savingDetails ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Scheduled time */}
          {can(session.role, 'editJob') && (
            <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                {t('scheduledTime' as import('@/lib/i18n').TKeys)}
              </div>
              <input
                type="datetime-local"
                value={job.scheduledAt
                  ? new Date(job.scheduledAt).toLocaleString('sv-SE', { timeZoneName: undefined }).slice(0, 16)
                  : ''}
                onChange={e => updateScheduledAt(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 12,
                  padding: '8px 10px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
              {job.scheduledAt && (
                <button
                  onClick={() => updateScheduledAt('')}
                  style={{ marginTop: 5, fontSize: 10, color: 'var(--text4)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  {t('clearSchedule' as import('@/lib/i18n').TKeys)}
                </button>
              )}
            </div>
          )}

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

          {/* Photos */}
          {photos.length > 0 && (
            <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                Photos · {photos.length}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {photos.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setLightboxSrc(p.data)}
                    style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: 'var(--bg3)' }}
                  >
                    <img src={p.data} alt="job photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
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
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: can(session.role, 'archiveJob') && job.status === 'done' && !job.archivedAt ? 8 : 0 }}>
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
          {can(session.role, 'archiveJob') && job.status === 'done' && !job.archivedAt && (
            <button
              onClick={archiveJob}
              disabled={archiving}
              style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text4)', fontSize: 12, fontWeight: 600, padding: '8px 0', cursor: archiving ? 'wait' : 'pointer', opacity: archiving ? 0.6 : 1 }}>
              {archiving ? 'Archiving…' : `📋 ${t('archive')} — move to history`}
            </button>
          )}
        </div>
      </div>

      {/* Invoice prompt modal */}
      {showInvoicePrompt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: 28, maxWidth: 340, width: '100%', textAlign: 'center', animation: 'fadeIn .2s ease', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>{t('jobComplete')}</div>
            <div style={{ fontSize: 13, color: 'var(--text4)', lineHeight: 1.5, marginBottom: 22 }}>
              Would you like to create an invoice for <strong style={{ color: 'var(--text)' }}>{job.client}</strong>?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowInvoicePrompt(false)}
                style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text3)', fontSize: 13, fontWeight: 700, padding: '11px 0', cursor: 'pointer' }}>
                {t('notNow')}
              </button>
              <Link
                href="/invoices"
                onClick={() => setShowInvoicePrompt(false)}
                style={{ flex: 2, background: 'var(--amber)', border: 'none', borderRadius: 9, color: '#080c1a', fontSize: 13, fontWeight: 800, padding: '11px 0', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('createInvoice')}
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Photo lightbox */}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <img src={lightboxSrc} alt="full photo" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 10, objectFit: 'contain' }} />
          <button
            onClick={e => { e.stopPropagation(); setLightboxSrc(null) }}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
