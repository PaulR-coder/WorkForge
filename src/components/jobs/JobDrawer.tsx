'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import Link from 'next/link'
import type { SessionUser } from '@/lib/auth'
import { trackEvent } from '@/lib/posthog'
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
  clientEmail: string | null
  clientPhone: string | null
  tech: { id: string; name: string; initials: string; phone?: string | null } | null
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

const PRIORITY_BG: Record<string, string> = {
  low: 'rgba(86,104,130,.15)', normal: 'rgba(91,163,245,.12)', high: 'rgba(245,158,11,.12)', urgent: 'rgba(239,68,68,.12)',
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'var(--purple)', admin: 'var(--amber)', dispatcher: '#5ba3f5', tech: 'var(--green)',
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--text4)',
  textTransform: 'uppercase', letterSpacing: '.7px',
  marginBottom: 12, display: 'block',
  fontFamily: 'var(--font-display, system-ui)',
}

export default function JobDrawer({
  jobId, users, session, onClose, onJobUpdate, onOpenPayment,
}: {
  jobId: string
  users: User[]
  session: SessionUser
  onClose: () => void
  onJobUpdate: (updated: { id: string; status: string; tech: { id: string; name: string; initials: string } | null; archived?: boolean }) => void
  onOpenPayment: (jobId: string, client: string) => void
}) {
  const [job, setJob]                       = useState<DetailJob | null>(null)
  const [loading, setLoading]               = useState(true)
  const [msgText, setMsgText]               = useState('')
  const [sending, setSending]               = useState(false)
  const [editingTech, setEditingTech]       = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [editForm, setEditForm]             = useState({ client: '', address: '', type: '', priority: '', description: '', clientEmail: '', clientPhone: '' })
  const [savingDetails, setSavingDetails]   = useState(false)
  const [photos, setPhotos]                 = useState<Photo[]>([])
  const [lightboxSrc, setLightboxSrc]       = useState<string | null>(null)
  const [loadError, setLoadError]           = useState(false)
  const [showInvoicePrompt, setShowInvoicePrompt] = useState(false)
  const [archiving, setArchiving]           = useState(false)
  const chatRef    = useRef<HTMLDivElement>(null)
  const msgInputRef = useRef<HTMLInputElement>(null)
  const { t }      = useLang()
  const isMobile   = useIsMobile()
  const { toast }  = useToast()

  useEffect(() => {
    setLoading(true); setLoadError(false)
    fetch(`/api/jobs/${jobId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => { setJob(data); setLoading(false) })
      .catch(() => { setLoadError(true); setLoading(false) })
    fetch(`/api/jobs/${jobId}/photos`)
      .then(r => r.json()).then(data => { if (Array.isArray(data)) setPhotos(data) })
      .catch(() => {})
  }, [jobId])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [job?.messages])

  async function updateStatus(status: string) {
    if (!job) return
    const res = await fetch(`/api/jobs/${job.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    if (res.status === 202) {
      setJob(prev => prev ? { ...prev, status } : null)
      onJobUpdate({ id: job.id, status, tech: job.tech })
      toast(`Job marked ${status === 'done' ? 'complete' : status.replace('_', ' ')}`, 'success')
      trackEvent('job_status_changed', { status, jobType: job.type, jobId: job.id })
      if (status === 'done') setShowInvoicePrompt(true)
    } else if (res.ok) {
      const updated = await res.json()
      setJob(prev => prev ? { ...prev, status: updated.status, completedAt: updated.completedAt } : null)
      onJobUpdate({ id: job.id, status: updated.status, tech: updated.tech })
      toast(`Job marked ${status === 'done' ? 'complete' : status.replace('_', ' ')}`, 'success')
      trackEvent('job_status_changed', { status, jobType: job.type, jobId: job.id })
      if (status === 'done') setShowInvoicePrompt(true)
    } else {
      toast('Failed to update status', 'error')
    }
  }

  async function updateTech(techId: string) {
    if (!job) return
    const tech = users.find(u => u.id === techId) ?? null
    const res = await fetch(`/api/jobs/${job.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ techId: techId || null }) })
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
    const res = await fetch(`/api/jobs/${job.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduledAt, ...(scheduledAt ? { status: 'scheduled' } : {}) }) })
    if (res.status === 202) {
      const newStatus = scheduledAt ? 'scheduled' : job.status
      setJob(prev => prev ? { ...prev, scheduledAt: scheduledAt ?? null, status: newStatus } : null)
      onJobUpdate({ id: job.id, status: newStatus, tech: job.tech })
    } else if (res.ok) {
      const updated = await res.json()
      setJob(prev => prev ? { ...prev, scheduledAt: updated.scheduledAt ?? null, status: updated.status } : null)
      onJobUpdate({ id: job.id, status: updated.status, tech: updated.tech })
    }
  }

  function openEditDetails() {
    if (!job) return
    setEditForm({ client: job.client, address: job.address, type: job.type, priority: job.priority, description: job.description ?? '', clientEmail: job.clientEmail ?? '', clientPhone: job.clientPhone ?? '' })
    setEditingDetails(true)
  }

  async function saveDetails() {
    if (!job) return
    setSavingDetails(true)
    const patchBody = { ...editForm, clientEmail: editForm.clientEmail || null, clientPhone: editForm.clientPhone || null }
    const res = await fetch(`/api/jobs/${job.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patchBody) })
    if (res.status === 202) {
      setJob(prev => prev ? { ...prev, ...editForm, clientEmail: patchBody.clientEmail, clientPhone: patchBody.clientPhone } : null)
      onJobUpdate({ id: job.id, status: job.status, tech: job.tech })
      setEditingDetails(false)
      toast('Details saved', 'success')
    } else if (res.ok) {
      const updated = await res.json()
      setJob(prev => prev ? { ...prev, client: updated.client, address: updated.address, type: updated.type, priority: updated.priority, description: updated.description ?? '', clientEmail: updated.clientEmail ?? null, clientPhone: updated.clientPhone ?? null } : null)
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
    const res = await fetch(`/api/jobs/${job.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'archive' }) })
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
    const res = await fetch(`/api/jobs/${job.id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: msgText.trim() }) })
    if (res.status === 202) {
      setMsgText('')
    } else if (res.ok) {
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

  const drawerShell = (children: React.ReactNode) => (
    <div style={{ position:'fixed', inset:0, zIndex:900, display:'flex', justifyContent:'flex-end' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.55)', backdropFilter:'blur(2px)' }} onClick={onClose} />
      <div style={{ width:drawerWidth, background:'var(--bg2)', borderLeft:isMobile ? 'none' : '1px solid var(--border)', display:'flex', flexDirection:'column', position:'relative', zIndex:1, animation:'slideIn .26s cubic-bezier(.16,1,.3,1)', overflow:'hidden' }}>
        {children}
      </div>
      <style>{`@keyframes slideIn { from { transform:translateX(100%); opacity:0; } to { transform:none; opacity:1; } }`}</style>
    </div>
  )

  if (loading) return drawerShell(
    <>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
        <button onClick={onClose} style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:18, color:'var(--text4)', padding:4 }}>✕</button>
      </div>
      <DrawerSkeleton />
    </>
  )

  if (loadError) return drawerShell(
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:32 }}>
      <div style={{ width:52, height:52, borderRadius:14, background:'var(--red-dim)', border:'1px solid var(--red-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg viewBox="0 0 24 24" style={{width:22,height:22}} fill="none">
          <path d="M12 8v4M12 16h.01M3 12a9 9 0 1118 0 9 9 0 01-18 0z" stroke="var(--red)" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', textAlign:'center' }}>Failed to load job</div>
      <div style={{ fontSize:13, color:'var(--text4)', textAlign:'center' }}>Check your connection and try again.</div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={onClose} style={{ padding:'9px 16px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text3)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Close</button>
        <button onClick={() => { setLoadError(false); setLoading(true); fetch(`/api/jobs/${jobId}`).then(r => r.json()).then(data => { setJob(data); setLoading(false) }).catch(() => { setLoadError(true); setLoading(false) }) }}
          style={{ padding:'9px 16px', background:'var(--amber)', border:'none', borderRadius:8, color:'#080c1a', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          Try Again
        </button>
      </div>
    </div>
  )

  if (!job) return null

  const currentStep = STATUS_STEPS.findIndex(s => s.key === job.status)
  const priColor    = PRIORITY_COLOR[job.priority] ?? 'var(--text4)'

  return (
    <div style={{ position:'fixed', inset:0, zIndex:900, display:'flex', justifyContent:'flex-end' }}>
      {/* Backdrop */}
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.55)', backdropFilter:'blur(2px)' }} onClick={onClose} />

      {/* Drawer */}
      <div style={{ width:drawerWidth, background:'var(--bg2)', borderLeft:isMobile ? 'none' : '1px solid var(--border)', display:'flex', flexDirection:'column', position:'relative', zIndex:1, animation:'slideIn .26s cubic-bezier(.16,1,.3,1)', overflow:'hidden', fontFamily:'var(--font-body, system-ui)' }}>

        {/* Priority stripe */}
        <div style={{ height:4, background:priColor, flexShrink:0, opacity:.8 }} />

        {/* Header */}
        <div style={{ padding:'16px 18px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:18, fontWeight:800, color:'var(--text)', lineHeight:1.25, marginBottom: job.clientEmail || job.clientPhone ? 4 : 8, fontFamily:'var(--font-display, system-ui)' }}>
                {job.client}
              </div>
              {job.clientEmail && (
                <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2, marginBottom: 2 }}>
                  <a href={`mailto:${job.clientEmail}`} style={{ color: 'var(--text4)', textDecoration: 'none' }}>{job.clientEmail}</a>
                </div>
              )}
              {job.clientPhone && (
                <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2, marginBottom: 6 }}>
                  <a href={`tel:${job.clientPhone}`} style={{ color: 'var(--text4)', textDecoration: 'none' }}>{job.clientPhone}</a>
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:6 }}>
                <span style={{ fontSize:10, fontWeight:700, color:'var(--text3)', background:'var(--bg4)', padding:'2px 8px', borderRadius:4, fontFamily:'var(--font-display, system-ui)', letterSpacing:'.3px' }}>
                  {job.type}
                </span>
                <span style={{ fontSize:10, fontWeight:700, color:priColor, background:PRIORITY_BG[job.priority], padding:'2px 8px', borderRadius:4, border:`1px solid ${priColor}28` }}>
                  {t(job.priority as TKeys)}
                </span>
                <span style={{ fontSize:10, color:'var(--text4)', fontFamily:'var(--font-mono, monospace)' }}>
                  {new Date(job.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'50%', width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text4)', flexShrink:0 }}>
              <svg viewBox="0 0 12 12" style={{width:10,height:10}} fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:'auto', padding:'0 18px' }}>

          {/* ── Status pipeline ─────────────────────────────────────────── */}
          <div style={{ padding:'16px 0', borderBottom:'1px solid var(--border)' }}>
            <span style={SECTION_LABEL}>{t('status')}</span>
            <div style={{ display:'flex', alignItems:'flex-start' }}>
              {STATUS_STEPS.map((step, i) => {
                const active = job.status === step.key
                const past   = i < currentStep
                return (
                  <Fragment key={step.key}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7, flexShrink:0 }}>
                      <button
                        disabled={!can(session.role, 'editJob')}
                        onClick={() => can(session.role, 'editJob') && updateStatus(step.key)}
                        title={t(step.labelKey)}
                        style={{
                          width: active ? 26 : 20, height: active ? 26 : 20,
                          borderRadius: '50%',
                          background: active ? step.color : past ? step.color : 'var(--bg4)',
                          border: `2.5px solid ${active ? step.color : past ? step.color : 'var(--border2)'}`,
                          cursor: can(session.role, 'editJob') ? 'pointer' : 'default',
                          boxShadow: active ? `0 0 0 5px ${step.color}22` : 'none',
                          transition: 'all .2s cubic-bezier(.16,1,.3,1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {past && (
                          <svg viewBox="0 0 10 10" style={{width:8,height:8}} fill="none">
                            <path d="M2 5l2.5 2.5L8 3" stroke="#080c1a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {active && <div style={{ width:8, height:8, borderRadius:'50%', background:'#080c1a' }} />}
                      </button>
                      <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px', color:active ? step.color : past ? `${step.color}60` : 'var(--text4)', textAlign:'center', maxWidth:54, fontFamily:'var(--font-display, system-ui)' }}>
                        {t(step.labelKey)}
                      </span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div style={{ flex:1, height:2, background: i < currentStep ? STATUS_STEPS[i].color : 'var(--border)', marginTop:10, transition:'background .3s' }} />
                    )}
                  </Fragment>
                )
              })}
            </div>
          </div>

          {/* ── Details ─────────────────────────────────────────────────── */}
          <div style={{ padding:'16px 0', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', marginBottom:editingDetails ? 14 : 0 }}>
              <span style={{ ...SECTION_LABEL, marginBottom:0, flex:1 }}>Details</span>
              {can(session.role, 'editJob') && !editingDetails && (
                <button onClick={openEditDetails} style={{ fontSize:11, color:'var(--amber)', background:'transparent', border:'none', cursor:'pointer', fontWeight:700, fontFamily:'inherit' }}>Edit</button>
              )}
            </div>

            {editingDetails ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:10 }}>
                {[{ label:'Client', key:'client' }, { label:'Address', key:'address' }, { label:'Type', key:'type' }].map(f => (
                  <div key={f.key}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--text4)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.5px' }}>{f.label}</div>
                    <input value={editForm[f.key as keyof typeof editForm]} onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:13, padding:'8px 10px', outline:'none', fontFamily:'inherit', boxSizing:'border-box' as const }} />
                  </div>
                ))}
                {/* Client Email */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
                    Client Email
                  </label>
                  <input
                    type="email"
                    value={editForm.clientEmail ?? ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, clientEmail: e.target.value }))}
                    placeholder="client@example.com"
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, padding: '8px 10px', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                {/* Client Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
                    Client Phone
                  </label>
                  <input
                    type="tel"
                    value={editForm.clientPhone ?? ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, clientPhone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, padding: '8px 10px', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text4)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.5px' }}>Priority</div>
                  <select value={editForm.priority} onChange={e => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                    style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:13, padding:'8px 10px', outline:'none' }}>
                    {['low','normal','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text4)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.5px' }}>Description</div>
                  <textarea value={editForm.description} onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))} rows={3}
                    style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:13, padding:'8px 10px', outline:'none', fontFamily:'inherit', boxSizing:'border-box' as const, resize:'vertical' }} />
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => setEditingDetails(false)} style={{ flex:1, background:'var(--bg4)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text3)', fontSize:12, fontWeight:700, padding:'9px 0', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                  <button onClick={saveDetails} disabled={savingDetails} style={{ flex:2, background:'var(--amber)', border:'none', borderRadius:8, color:'#080c1a', fontSize:12, fontWeight:700, padding:'9px 0', cursor:'pointer', opacity:savingDetails ? .6 : 1, fontFamily:'inherit' }}>
                    {savingDetails ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:10 }}>
                <div>
                  <div style={{ fontSize:10, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'.5px', fontWeight:700, marginBottom:4 }}>{t('fullAddress')}</div>
                  <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.4 }}>{job.address}</div>
                </div>
                {job.description && (
                  <div>
                    <div style={{ fontSize:10, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'.5px', fontWeight:700, marginBottom:4 }}>{t('description')}</div>
                    <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.55 }}>{job.description}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Scheduled time ──────────────────────────────────────────── */}
          {can(session.role, 'editJob') && (
            <div style={{ padding:'16px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={SECTION_LABEL}>{t('scheduledTime' as import('@/lib/i18n').TKeys)}</span>
              <input type="datetime-local"
                value={job.scheduledAt ? new Date(job.scheduledAt).toLocaleString('sv-SE', { timeZoneName: undefined }).slice(0, 16) : ''}
                onChange={e => updateScheduledAt(e.target.value)}
                style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:9, color:'var(--text)', fontSize:13, padding:'9px 12px', outline:'none', fontFamily:'inherit', boxSizing:'border-box' as const }}
              />
              {job.scheduledAt && (
                <button onClick={() => updateScheduledAt('')} style={{ marginTop:6, fontSize:11, color:'var(--text4)', background:'transparent', border:'none', cursor:'pointer', padding:0, textDecoration:'underline', fontFamily:'inherit' }}>
                  {t('clearSchedule' as import('@/lib/i18n').TKeys)}
                </button>
              )}
            </div>
          )}

          {/* ── Assigned tech ───────────────────────────────────────────── */}
          <div style={{ padding:'16px 0', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', marginBottom:editingTech ? 10 : 0 }}>
              <span style={{ ...SECTION_LABEL, marginBottom:0, flex:1 }}>{t('assignedTech')}</span>
              {can(session.role, 'assignTech') && (
                <button onClick={() => setEditingTech(e => !e)} style={{ fontSize:11, color:'var(--amber)', background:'transparent', border:'none', cursor:'pointer', fontWeight:700, fontFamily:'inherit' }}>
                  {editingTech ? t('cancel') : t('change')}
                </button>
              )}
            </div>
            {editingTech ? (
              <select defaultValue={job.tech?.id ?? ''} onChange={e => updateTech(e.target.value)} style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:9, color:'var(--text)', fontSize:13, padding:'9px 12px', outline:'none' }}>
                <option value="">{t('unassigned')}</option>
                {users.filter(u => u.role === 'tech').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            ) : (
              job.tech ? (
                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:10 }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--amber)', color:'#080c1a', fontSize:12, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {job.tech.initials}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text2)' }}>{job.tech.name}</div>
                    <div style={{ fontSize:10, color:'var(--text4)' }}>Field Technician</div>
                  </div>
                  {job.tech.phone && (
                    <a
                      href={`tel:${job.tech.phone}`}
                      title={`Call ${job.tech.name}`}
                      style={{
                        display:'flex', alignItems:'center', justifyContent:'center',
                        width:34, height:34, borderRadius:'50%',
                        background:'var(--green)', color:'#fff',
                        textDecoration:'none', flexShrink:0, fontSize:16,
                      }}
                    >
                      📞
                    </a>
                  )}
                </div>
              ) : (
                <div style={{ fontSize:13, color:'var(--text4)', marginTop:8, fontStyle:'italic' }}>{t('unassigned')}</div>
              )
            )}
          </div>

          {/* ── Linked invoices ─────────────────────────────────────────── */}
          {job.invoices.length > 0 && (
            <div style={{ padding:'16px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={SECTION_LABEL}>{t('linkedInvoices')}</span>
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {job.invoices.map(inv => {
                  const c: Record<string, string> = { draft:'var(--text3)', sent:'#5ba3f5', paid:'var(--green)', overdue:'var(--red)' }
                  const col = c[inv.status] ?? 'var(--text)'
                  return (
                    <div key={inv.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'var(--bg3)', borderRadius:8, border:'1px solid var(--border)' }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'var(--text3)', flex:1, fontFamily:'var(--font-mono, monospace)' }}>{inv.number}</span>
                      <span style={{ fontSize:13, fontWeight:800, color:col, fontFamily:'var(--font-mono, monospace)' }}>${inv.total.toLocaleString()}</span>
                      <span style={{ fontSize:9, fontWeight:700, color:col, background:`${col}18`, padding:'2px 8px', borderRadius:20, border:`1px solid ${col}30`, letterSpacing:'.3px' }}>{t(inv.status as TKeys)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Linked equipment ────────────────────────────────────────── */}
          {job.equipment.length > 0 && (
            <div style={{ padding:'16px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={SECTION_LABEL}>{t('linkedEquipment')}</span>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {job.equipment.map(eq => (
                  <div key={eq.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', background:'var(--bg3)', borderRadius:8, border:'1px solid var(--border)' }}>
                    <span style={{ fontSize:18 }}>{eq.icon}</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>{eq.name}</div>
                      <div style={{ fontSize:10, color:'var(--text4)' }}>{eq.brand}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Photos ──────────────────────────────────────────────────── */}
          {photos.length > 0 && (
            <div style={{ padding:'16px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={SECTION_LABEL}>Photos · {photos.length}</span>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6 }}>
                {photos.map(p => (
                  <div key={p.id} onClick={() => setLightboxSrc(p.data)} style={{ aspectRatio:'1', borderRadius:9, overflow:'hidden', cursor:'pointer', background:'var(--bg3)', border:'1px solid var(--border)' }}>
                    <img src={p.data} alt="job photo" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Internal chat ────────────────────────────────────────────── */}
          <div style={{ padding:'16px 0' }}>
            <span style={SECTION_LABEL}>{t('internalMessages')}</span>
            <div ref={chatRef} style={{ maxHeight:230, overflowY:'auto', display:'flex', flexDirection:'column', gap:10, marginBottom:12 }}>
              {job.messages.length === 0 && (
                <div style={{ fontSize:12, color:'var(--text4)', textAlign:'center', padding:'20px 0', fontStyle:'italic' }}>{t('noMessages')}</div>
              )}
              {job.messages.map(msg => {
                const isMe     = msg.author.name === session.name
                const roleColor = ROLE_COLORS[msg.author.role] ?? 'var(--text3)'
                return (
                  <div key={msg.id} style={{ display:'flex', gap:8, flexDirection:isMe ? 'row-reverse' : 'row', alignItems:'flex-end' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:roleColor, color:'#080c1a', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {msg.author.initials}
                    </div>
                    <div style={{ maxWidth:'74%' }}>
                      <div style={{ fontSize:10, color:'var(--text4)', marginBottom:4, textAlign:isMe ? 'right' : 'left', fontFamily:'var(--font-mono, monospace)' }}>
                        {isMe ? 'You' : msg.author.name} · {new Date(msg.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                      </div>
                      <div style={{ background:isMe ? 'rgba(245,158,11,.13)' : 'var(--bg3)', border:`1px solid ${isMe ? 'rgba(245,158,11,.26)' : 'var(--border)'}`, borderRadius:isMe ? '12px 12px 3px 12px' : '12px 12px 12px 3px', padding:'8px 12px', fontSize:13, color:'var(--text2)', lineHeight:1.45 }}>
                        {msg.body}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <input ref={msgInputRef} value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder={t('typeMessage')}
                style={{ flex:1, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:9, color:'var(--text)', fontSize:13, padding:'9px 12px', outline:'none', fontFamily:'inherit', transition:'border-color 140ms' }}
                onFocus={e => e.target.style.borderColor = 'var(--amber)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button onClick={sendMessage} disabled={sending || !msgText.trim()}
                style={{ background:'var(--amber)', color:'#080c1a', border:'none', borderRadius:9, fontSize:12, fontWeight:800, padding:'9px 14px', cursor:'pointer', opacity:(!msgText.trim() || sending) ? .5 : 1, fontFamily:'var(--font-display, inherit)', letterSpacing:'.2px' }}>
                {t('send')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer actions ───────────────────────────────────────────── */}
        <div style={{ padding:'14px 18px', borderTop:'1px solid var(--border)', flexShrink:0, background:'var(--bg3)' }}>
          <div style={{ display:'flex', gap:8, marginBottom: can(session.role, 'archiveJob') && job.status === 'done' && !job.archivedAt ? 8 : 0 }}>
            {can(session.role, 'collectPayment') && (
              <button onClick={() => onOpenPayment(job.id, job.client)}
                style={{ flex:1, background:'var(--green)', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, padding:'11px 0', cursor:'pointer', fontFamily:'inherit' }}>
                {t('collectPayment')}
              </button>
            )}
            {can(session.role, 'editJob') && job.status !== 'done' && (
              <button onClick={() => updateStatus('done')}
                style={{ flex:1, background:'var(--amber)', color:'#080c1a', border:'none', borderRadius:9, fontSize:13, fontWeight:800, padding:'11px 0', cursor:'pointer', fontFamily:'var(--font-display, inherit)', letterSpacing:'.2px' }}>
                {t('markComplete')}
              </button>
            )}
          </div>
          {can(session.role, 'archiveJob') && job.status === 'done' && !job.archivedAt && (
            <button onClick={archiveJob} disabled={archiving}
              style={{ width:'100%', background:'transparent', border:'1px solid var(--border)', borderRadius:9, color:'var(--text4)', fontSize:12, fontWeight:600, padding:'9px 0', cursor:archiving ? 'wait' : 'pointer', opacity:archiving ? .6 : 1, fontFamily:'inherit' }}>
              {archiving ? 'Archiving…' : `${t('archive')} — move to history`}
            </button>
          )}
        </div>
      </div>

      {/* ── Invoice prompt ───────────────────────────────────────────────── */}
      {showInvoicePrompt && (
        <div style={{ position:'fixed', inset:0, zIndex:1200, background:'rgba(0,0,0,.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderTop:'3px solid var(--green)', borderRadius:18, padding:28, maxWidth:340, width:'100%', textAlign:'center', animation:'fadeIn .2s ease', boxShadow:'var(--shadow-xl)' }}>
            <div style={{ width:52, height:52, borderRadius:14, background:'var(--green-dim)', border:'1px solid rgba(34,197,94,.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <svg viewBox="0 0 24 24" style={{width:22,height:22}} fill="none">
                <path d="M20 6L9 17l-5-5" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ fontSize:17, fontWeight:800, color:'var(--text)', marginBottom:6, fontFamily:'var(--font-display, system-ui)' }}>{t('jobComplete')}</div>
            <div style={{ fontSize:13, color:'var(--text4)', lineHeight:1.55, marginBottom:24 }}>
              Create an invoice for <strong style={{ color:'var(--text)' }}>{job.client}</strong>?
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowInvoicePrompt(false)} style={{ flex:1, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:9, color:'var(--text3)', fontSize:13, fontWeight:700, padding:'11px 0', cursor:'pointer', fontFamily:'inherit' }}>
                {t('notNow')}
              </button>
              <Link href="/invoices" onClick={() => setShowInvoicePrompt(false)} style={{ flex:2, background:'var(--amber)', border:'none', borderRadius:9, color:'#080c1a', fontSize:13, fontWeight:800, padding:'11px 0', cursor:'pointer', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display, inherit)', letterSpacing:'.2px' }}>
                {t('createInvoice')}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo lightbox ───────────────────────────────────────────────── */}
      {lightboxSrc && (
        <div onClick={() => setLightboxSrc(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.94)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <img src={lightboxSrc} alt="full photo" style={{ maxWidth:'100%', maxHeight:'100%', borderRadius:10, objectFit:'contain' }} />
          <button onClick={e => { e.stopPropagation(); setLightboxSrc(null) }} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,.14)', border:'none', borderRadius:'50%', width:36, height:36, cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg viewBox="0 0 12 12" style={{width:10,height:10}} fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      <style>{`@keyframes slideIn { from { transform:translateX(100%); opacity:0; } to { transform:none; opacity:1; } }`}</style>
    </div>
  )
}
