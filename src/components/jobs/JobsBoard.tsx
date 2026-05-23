'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SessionUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { useLang } from '@/components/LangProvider'
import { useIsMobile } from '@/lib/useIsMobile'
import type { TKeys } from '@/lib/i18n'
import JobDrawer from './JobDrawer'
import PaymentOverlay from './PaymentOverlay'
import { useToast } from '@/components/Toast'
import { getPendingJobs, subscribePendingJobs, addPendingJob } from '@/lib/pendingJobs'

type Job = {
  id: string
  client: string
  address: string
  description: string
  type: string
  priority: string
  status: string
  scheduledAt?: string | Date | null
  tech: { id: string; name: string; initials: string } | null
}

type User = { id: string; name: string; initials: string; role: string }

const COLUMNS: { key: string; labelKey: TKeys; color: string }[] = [
  { key: 'open',        labelKey: 'open',        color: '#5ba3f5' },
  { key: 'scheduled',   labelKey: 'scheduled',   color: 'var(--amber)' },
  { key: 'in_progress', labelKey: 'inProgress',  color: 'var(--purple)' },
  { key: 'done',        labelKey: 'done',        color: 'var(--green)' },
]

const PRIORITY_COLOR: Record<string, string> = {
  low: '#3d4f6e', normal: '#5ba3f5', high: 'var(--amber)', urgent: 'var(--red)',
}

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent',
}

const TYPE_COLOR: Record<string, string> = {
  HVAC: '#5ba3f5', Electrical: 'var(--amber)', Plumbing: '#2dd4bf',
  Refrigeration: '#a78bfa', Maintenance: '#6b7280', Emergency: 'var(--red)',
}

export default function JobsBoard({ initialJobs, users, session, initialStatusFilter, initialTypeFilter }: {
  initialJobs: Job[]
  users: User[]
  session: SessionUser
  initialStatusFilter?: string
  initialTypeFilter?: string
}) {
  const [jobs, setJobs]               = useState<Job[]>(initialJobs)
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter ?? 'all')
  const [typeFilter, setTypeFilter]     = useState(initialTypeFilter ?? 'all')
  const [showCreate, setShowCreate]   = useState(false)
  const [form, setForm]               = useState({ client: '', address: '', type: 'HVAC', priority: 'normal', description: '', techId: '' })
  const [saving, setSaving]           = useState(false)
  const [dragId, setDragId]           = useState<string | null>(null)
  const [dragOver, setDragOver]       = useState<string | null>(null)
  const [pendingIds, setPendingIds]   = useState<Set<string>>(() => new Set(getPendingJobs()))
  const [drawerJobId, setDrawerJobId] = useState<string | null>(null)
  const [paymentJob, setPaymentJob]   = useState<{ id: string; client: string } | null>(null)
  const [lastSync, setLastSync]       = useState(Date.now())
  const [, setTick]                   = useState(0)
  const { t }      = useLang()
  const isMobile   = useIsMobile()
  const { toast }  = useToast()

  useEffect(() => subscribePendingJobs(setPendingIds), [])
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const pollJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs')
      if (res.ok && !res.headers.get('X-WF-Offline')) {
        const fresh: Job[] = await res.json()
        setJobs(fresh)
        setLastSync(Date.now())
      }
    } catch { /* silent fail */ }
  }, [])

  useEffect(() => {
    const interval = setInterval(pollJobs, 15000)
    return () => clearInterval(interval)
  }, [pollJobs])

  async function moveJob(jobId: string, newStatus: string) {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j))
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.status === 202) addPendingJob(jobId)
  }

  async function createJob() {
    if (!form.client || !form.address) return
    setSaving(true)
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, techId: form.techId || null }),
    })
    if (res.ok) {
      const job = await res.json()
      setJobs(prev => [job, ...prev])
      setShowCreate(false)
      setForm({ client: '', address: '', type: 'HVAC', priority: 'normal', description: '', techId: '' })
      toast('Work order created', 'success')
    } else {
      const body = await res.json().catch(() => ({}))
      toast(body.cannotQueue ? "Can't create jobs offline — reconnect first" : 'Failed to create job', 'error')
    }
    setSaving(false)
  }

  async function deleteJob(id: string) {
    if (!confirm(t('deleteJob'))) return
    const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setJobs(prev => prev.filter(j => j.id !== id))
      toast('Job moved to History — restore it any time', 'info')
    } else {
      toast('Failed to archive job', 'error')
    }
  }

  function handleJobUpdate(updated: { id: string; status: string; tech: Job['tech']; archived?: boolean }) {
    if (updated.archived) {
      setJobs(prev => prev.filter(j => j.id !== updated.id))
    } else {
      setJobs(prev => prev.map(j => j.id === updated.id ? { ...j, ...updated } : j))
    }
  }

  const timeSince  = Math.round((Date.now() - lastSync) / 1000)
  const techs      = users.filter(u => u.role === 'tech')

  const jobTypes = [...new Set(jobs.map((j: { type?: string | null }) => j.type).filter((t): t is string => Boolean(t)))].sort()

  const filteredJobs = jobs
    .filter((j: { status: string }) => statusFilter === 'all' || j.status === statusFilter)
    .filter((j: { type?: string | null }) => typeFilter === 'all' || j.type === typeFilter)

  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 9, color: 'var(--text)', fontSize: 13, padding: '10px 12px',
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 140ms',
    boxSizing: 'border-box',
    ...extra,
  })

  return (
    <>
      <style>{`
        .wf-card { transition:box-shadow 130ms, transform 130ms, border-color 130ms; }
        .wf-card:hover { box-shadow:var(--shadow-card); transform:translateY(-2px); border-color:var(--border2) !important; }
        .wf-col-drop { transition:background 150ms, border-color 150ms; }
        .wf-del-btn { transition:color 110ms, background 110ms; }
        .wf-del-btn:hover { color:var(--red) !important; background:var(--red-dim) !important; }
        .wf-modal-input:focus { border-color:var(--amber) !important; outline:none; }
      `}</style>

      <div style={{ padding: isMobile ? '12px 10px' : '18px 20px', height:'100%', display:'flex', flexDirection:'column', fontFamily:'var(--font-body, system-ui)' }}>

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
            <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text)', letterSpacing:'-.4px', fontFamily:'var(--font-display, system-ui)' }}>
              {t('workOrders')}
            </h1>
            <span style={{ fontSize:12, color:'var(--text4)', fontFamily:'var(--font-mono, monospace)' }}>
              {filteredJobs.length}
            </span>
          </div>

          {!isMobile && (
            <div style={{ display:'flex', gap:5, marginLeft:6 }}>
              {COLUMNS.map(col => {
                const count = filteredJobs.filter(j => j.status === col.key).length
                return (
                  <div key={col.key} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, background:`${col.color}14`, color:col.color, border:`1px solid ${col.color}28`, fontFamily:'var(--font-display, system-ui)', letterSpacing:'.3px' }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:col.color, display:'inline-block' }} />
                    {count} {t(col.labelKey)}
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
            {!isMobile && (
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text4)', fontFamily:'var(--font-mono, monospace)' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', display:'inline-block', animation:'pulse 2s ease infinite' }} />
                {timeSince < 5 ? 'Live' : `${timeSince}s ago`}
              </div>
            )}
            {can(session.role, 'createJob') && (
              <button onClick={() => setShowCreate(true)} style={{ background:'var(--amber)', color:'#060a17', border:'none', borderRadius:9, fontSize:13, fontWeight:800, padding:isMobile ? '9px 14px' : '9px 18px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:'var(--font-display, system-ui)', letterSpacing:'.2px' }}>
                <svg viewBox="0 0 14 14" style={{width:12,height:12}} fill="none">
                  <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
                {!isMobile && t('newJob')}
              </button>
            )}
          </div>
        </div>

        {/* ── Filter bar ────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', ...COLUMNS.map(c => c.key)].map(s => (
              <button
                type="button"
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '4px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700,
                  background: statusFilter === s ? 'var(--amber)' : 'var(--bg3)',
                  color: statusFilter === s ? '#060a17' : 'var(--text3)',
                }}
              >
                {s === 'all' ? 'All Status' : t(COLUMNS.find(c => c.key === s)!.labelKey)}
              </button>
            ))}
          </div>
          {jobTypes.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {['all', ...jobTypes].map(t => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    padding: '4px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 700,
                    background: typeFilter === t ? 'var(--amber)' : 'var(--bg3)',
                    color: typeFilter === t ? '#060a17' : 'var(--text3)',
                  }}
                >
                  {t === 'all' ? 'All Types' : t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Kanban board ──────────────────────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:isMobile ? 'repeat(4, 82vw)' : 'repeat(4, 1fr)', gap:10, flex:1, overflowX:isMobile ? 'auto' : 'hidden', overflowY:'hidden', WebkitOverflowScrolling:'touch', scrollSnapType:isMobile ? 'x mandatory' : undefined, paddingBottom:isMobile ? 4 : 0 } as React.CSSProperties}>

          {COLUMNS.map(col => {
            const colJobs    = filteredJobs.filter(j => j.status === col.key)
            const isDragTarget = dragOver === col.key

            return (
              <div
                key={col.key}
                className="wf-col-drop"
                onDragOver={e => { e.preventDefault(); setDragOver(col.key) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => {
                  if (dragId && can(session.role, 'editJob')) moveJob(dragId, col.key)
                  setDragOver(null)
                }}
                style={{
                  background: isDragTarget ? `${col.color}08` : 'var(--bg2)',
                  border: `1px solid ${isDragTarget ? col.color + '55' : 'var(--border)'}`,
                  borderTop: `3px solid ${isDragTarget ? col.color : col.color + '50'}`,
                  borderRadius: '0 0 14px 14px',
                  display: 'flex', flexDirection: 'column',
                  overflow: 'hidden',
                  scrollSnapAlign: isMobile ? 'start' : undefined,
                } as React.CSSProperties}
              >
                {/* Column header */}
                <div style={{ padding:'12px 14px 10px', display:'flex', alignItems:'center', gap:8, flexShrink:0, borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:12, fontWeight:800, color:col.color, flex:1, letterSpacing:'.8px', textTransform:'uppercase', fontFamily:'var(--font-display, system-ui)' }}>
                    {t(col.labelKey)}
                  </span>
                  <span style={{ fontSize:11, fontWeight:700, color:colJobs.length > 0 ? col.color : 'var(--text4)', background:colJobs.length > 0 ? `${col.color}18` : 'var(--bg4)', minWidth:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-mono, monospace)' }}>
                    {colJobs.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ flex:1, overflowY:'auto', padding:'8px', display:'flex', flexDirection:'column', gap:6 }}>
                  {colJobs.length === 0 ? (
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', minHeight:100, gap:8, opacity:.3 }}>
                      <div style={{ width:28, height:28, borderRadius:8, background:'var(--bg4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <svg viewBox="0 0 16 16" style={{width:13,height:13}} fill="none">
                          <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                          <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <span style={{ fontSize:10, color:'var(--text4)', fontWeight:600, letterSpacing:'.3px' }}>No jobs</span>
                    </div>
                  ) : (
                    colJobs.map(job => {
                      const priColor  = PRIORITY_COLOR[job.priority] ?? 'var(--text4)'
                      const typeColor = TYPE_COLOR[job.type] ?? 'var(--text4)'
                      const isPending = pendingIds.has(job.id)

                      return (
                        <div
                          key={job.id}
                          className="wf-card"
                          draggable={can(session.role, 'editJob')}
                          onDragStart={() => setDragId(job.id)}
                          onDragEnd={() => { setDragId(null); setDragOver(null) }}
                          onClick={() => setDrawerJobId(job.id)}
                          style={{
                            background: 'var(--bg3)',
                            borderRadius: 10,
                            cursor: 'pointer',
                            overflow: 'hidden',
                            border: '1px solid var(--border)',
                            borderLeft: `4px solid ${priColor}`,
                            opacity: dragId === job.id ? .45 : 1,
                            animation: 'fadeIn .18s ease',
                            position: 'relative',
                          }}
                        >
                          {isPending && (
                            <div style={{ position:'absolute', top:8, right:8, width:6, height:6, borderRadius:'50%', background:'var(--amber)', animation:'pulse 1.5s ease infinite' }} title="Pending sync" />
                          )}

                          <div style={{ padding:'10px 12px 10px 10px' }}>
                            {/* Type tag + priority */}
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
                              <span style={{ fontSize:9, fontWeight:800, letterSpacing:'.7px', textTransform:'uppercase', color:typeColor, background:`${typeColor}14`, padding:'2px 7px', borderRadius:4, fontFamily:'var(--font-display, system-ui)' }}>
                                {job.type}
                              </span>
                              {job.priority !== 'normal' && (
                                <span style={{ fontSize:9, fontWeight:800, letterSpacing:'.4px', textTransform:'uppercase', color:priColor, fontFamily:'var(--font-display, system-ui)' }}>
                                  {PRIORITY_LABEL[job.priority]}
                                </span>
                              )}
                            </div>

                            {/* Client name */}
                            <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', lineHeight:1.3, marginBottom:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {job.client}
                            </div>

                            {/* Scheduled time */}
                            {job.scheduledAt && (
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>⏰</span>
                                {new Date(job.scheduledAt).toLocaleString('en-US', {
                                  weekday: 'short', month: 'short', day: 'numeric',
                                  hour: 'numeric', minute: '2-digit', hour12: true,
                                })}
                              </div>
                            )}

                            {/* Address */}
                            <div style={{ fontSize:10, color:'var(--text4)', marginBottom:9, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:4 }}>
                              <svg viewBox="0 0 16 16" style={{width:8,height:8,flexShrink:0,opacity:.7}} fill="currentColor">
                                <path d="M8 1.5C5.5 1.5 3.5 3.46 3.5 5.9c0 3.28 3.8 7.72 4.15 8.12a.47.47 0 0 0 .7 0C8.7 13.62 12.5 9.18 12.5 5.9 12.5 3.46 10.5 1.5 8 1.5zm0 6A2 2 0 1 1 8 3.5a2 2 0 0 1 0 4z"/>
                              </svg>
                              <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {job.address.split(',')[0]}
                              </span>
                            </div>

                            {/* Footer: tech + delete */}
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                              {job.tech ? (
                                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                  <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--amber)', color:'#060a17', fontSize:7, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                    {job.tech.initials}
                                  </div>
                                  <span style={{ fontSize:10, color:'var(--text3)', fontWeight:600 }}>
                                    {job.tech.name.split(' ')[0]}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ fontSize:10, color:'var(--text4)', fontStyle:'italic' }}>{t('unassigned')}</span>
                              )}
                              {can(session.role, 'deleteJob') && (
                                <button
                                  className="wf-del-btn"
                                  onClick={e => { e.stopPropagation(); deleteJob(job.id) }}
                                  style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--text4)', padding:'2px 5px', borderRadius:5, lineHeight:1, fontSize:13 }}
                                >
                                  <svg viewBox="0 0 14 14" style={{width:11,height:11,display:'block'}} fill="none">
                                    <path d="M2 4h10M5 4V2.5h4V4M6 7v3M8 7v3M3 4l.75 7.5h6.5L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Create job modal ───────────────────────────────────────────── */}
        {showCreate && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:1000, display:'flex', alignItems:isMobile ? 'flex-end' : 'center', justifyContent:'center' }}
            onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderTop:`3px solid var(--amber)`, borderRadius:isMobile ? '18px 18px 0 0' : 18, padding:isMobile ? '22px 18px 36px' : '28px 28px', width:isMobile ? '100%' : 520, animation:isMobile ? 'slideUp .25s ease' : 'fadeIn .2s ease', maxHeight:'92vh', overflowY:'auto', boxShadow:'var(--shadow-xl)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                <div>
                  <div style={{ fontSize:17, fontWeight:800, color:'var(--text)', letterSpacing:'-.3px', fontFamily:'var(--font-display, system-ui)' }}>{t('createWorkOrder')}</div>
                  <div style={{ fontSize:11, color:'var(--text4)', marginTop:3 }}>Fill in the details below</div>
                </div>
                <button onClick={() => setShowCreate(false)} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'50%', width:30, height:30, cursor:'pointer', fontSize:14, color:'var(--text4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg viewBox="0 0 14 14" style={{width:10,height:10}} fill="none">
                    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:6 }}>{t('client')} *</label>
                    <input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} placeholder="Company or client name" autoFocus className="wf-modal-input" style={inp()} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:6 }}>{t('jobType')}</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="wf-modal-input" style={inp()}>
                      {['HVAC','Electrical','Plumbing','Refrigeration','Maintenance','Emergency'].map(jt => <option key={jt}>{jt}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:6 }}>{t('address')} *</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Job site address" className="wf-modal-input" style={inp()} />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:6 }}>{t('priority')}</label>
                    <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="wf-modal-input" style={inp({ borderLeft:`3px solid ${PRIORITY_COLOR[form.priority] ?? 'var(--text4)'}` })}>
                      {(['low','normal','high','urgent'] as TKeys[]).map(p => <option key={p} value={p}>{t(p)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:6 }}>{t('assignTech')}</label>
                    <select value={form.techId} onChange={e => setForm(f => ({ ...f, techId: e.target.value }))} className="wf-modal-input" style={inp()}>
                      <option value="">{t('unassigned')}</option>
                      {techs.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:6 }}>{t('description')}</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Issue details, notes for the tech…" className="wf-modal-input" style={{ ...inp(), height:72, resize:'vertical' } as React.CSSProperties} />
                </div>

                <div style={{ display:'flex', gap:8, justifyContent:'flex-end', paddingTop:4 }}>
                  <button onClick={() => setShowCreate(false)} style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:9, color:'var(--text3)', fontSize:13, fontWeight:600, padding:'10px 18px', cursor:'pointer', fontFamily:'inherit' }}>
                    {t('cancel')}
                  </button>
                  <button onClick={createJob} disabled={saving || !form.client || !form.address} style={{ background:'var(--amber)', color:'#060a17', border:'none', borderRadius:9, fontSize:13, fontWeight:800, padding:'10px 22px', cursor:'pointer', opacity:(saving || !form.client || !form.address) ? .5 : 1, transition:'opacity 140ms', fontFamily:'var(--font-display, inherit)', letterSpacing:'.2px' }}>
                    {saving ? 'Creating…' : t('createJob')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Job drawer ─────────────────────────────────────────────────── */}
        {drawerJobId && (
          <JobDrawer
            jobId={drawerJobId}
            users={users}
            session={session}
            onClose={() => setDrawerJobId(null)}
            onJobUpdate={handleJobUpdate}
            onOpenPayment={(id, client) => {
              setDrawerJobId(null)
              setPaymentJob({ id, client })
            }}
          />
        )}

        {/* ── Payment overlay ────────────────────────────────────────────── */}
        {paymentJob && (
          <PaymentOverlay
            jobId={paymentJob.id}
            clientName={paymentJob.client}
            onClose={() => setPaymentJob(null)}
            onSuccess={() => setPaymentJob(null)}
          />
        )}
      </div>
    </>
  )
}
