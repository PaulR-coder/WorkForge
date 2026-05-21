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
  tech: { id: string; name: string; initials: string } | null
}

type User = { id: string; name: string; initials: string; role: string }

const COLUMNS: { key: string; labelKey: TKeys; color: string; emptyIcon: string }[] = [
  { key: 'open',        labelKey: 'open',       color: '#5ba3f5',       emptyIcon: '📬' },
  { key: 'scheduled',   labelKey: 'scheduled',  color: 'var(--amber)',  emptyIcon: '📅' },
  { key: 'in_progress', labelKey: 'inProgress', color: 'var(--purple)', emptyIcon: '⚡' },
  { key: 'done',        labelKey: 'done',       color: 'var(--green)',  emptyIcon: '✅' },
]

const PRIORITY_COLOR: Record<string, string> = {
  low: '#3d4f6e', normal: '#5ba3f5', high: 'var(--amber)', urgent: 'var(--red)',
}

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent',
}

const TYPE_ICON: Record<string, string> = {
  HVAC: '❄', Electrical: '⚡', Plumbing: '🔧', Refrigeration: '🧊',
  Maintenance: '🔩', Emergency: '🚨',
}

export default function JobsBoard({ initialJobs, users, session }: {
  initialJobs: Job[]
  users: User[]
  session: SessionUser
}) {
  const [jobs, setJobs]           = useState<Job[]>(initialJobs)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]           = useState({ client: '', address: '', type: 'HVAC', priority: 'normal', description: '', techId: '' })
  const [saving, setSaving]       = useState(false)
  const [dragId, setDragId]       = useState<string | null>(null)
  const [dragOver, setDragOver]   = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set(getPendingJobs()))
  const [drawerJobId, setDrawerJobId] = useState<string | null>(null)
  const [paymentJob, setPaymentJob]   = useState<{ id: string; client: string } | null>(null)
  const [lastSync, setLastSync]   = useState(Date.now())
  const [, setTick]               = useState(0)
  const { t } = useLang()
  const isMobile  = useIsMobile()
  const { toast } = useToast()

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
      toast(body.cannotQueue ? 'Can\'t create jobs offline — reconnect first' : 'Failed to create job', 'error')
    }
    setSaving(false)
  }

  async function deleteJob(id: string) {
    if (!confirm(t('deleteJob'))) return
    const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setJobs(prev => prev.filter(j => j.id !== id))
      toast('Job deleted', 'info')
    } else {
      toast('Failed to delete job', 'error')
    }
  }

  function handleJobUpdate(updated: { id: string; status: string; tech: Job['tech']; archived?: boolean }) {
    if (updated.archived) {
      setJobs(prev => prev.filter(j => j.id !== updated.id))
    } else {
      setJobs(prev => prev.map(j => j.id === updated.id ? { ...j, ...updated } : j))
    }
  }

  const timeSince = Math.round((Date.now() - lastSync) / 1000)

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 9, color: 'var(--text)', fontSize: 12, padding: '9px 11px',
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 140ms',
    ...style,
  })

  const techs = users.filter(u => u.role === 'tech')

  return (
    <div style={{
      padding: isMobile ? '12px 10px' : '20px 20px 20px',
      height: '100%', display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 14, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.4px' }}>
            {t('workOrders')}
          </h1>
          <span style={{ fontSize: 12, color: 'var(--text4)', fontWeight: 500 }}>
            {jobs.length} total
          </span>
        </div>

        {/* Column count pills — desktop */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 5, marginLeft: 4 }}>
            {COLUMNS.map(col => {
              const count = jobs.filter(j => j.status === col.key).length
              return (
                <div key={col.key} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: `${col.color}14`, color: col.color,
                  border: `1px solid ${col.color}28`,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                  {count} {t(col.labelKey)}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Sync status */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text4)' }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: 'var(--green)',
                display: 'inline-block', animation: 'pulse 2s ease infinite',
              }} />
              {timeSince < 5 ? 'Live' : `${timeSince}s ago`}
            </div>
          )}

          {/* Create button */}
          {can(session.role, 'createJob') && (
            <button onClick={() => setShowCreate(true)} style={{
              background: 'var(--amber)', color: '#060a17', border: 'none',
              borderRadius: 9, fontSize: 12, fontWeight: 800,
              padding: isMobile ? '9px 14px' : '9px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
              {!isMobile && t('newJob')}
            </button>
          )}
        </div>
      </div>

      {/* ── Kanban board ──────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(4, 82vw)' : 'repeat(4, 1fr)',
        gap: 10, flex: 1,
        overflowX: isMobile ? 'auto' : 'hidden',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: isMobile ? 'x mandatory' : undefined,
        paddingBottom: isMobile ? 4 : 0,
      } as React.CSSProperties}>

        {COLUMNS.map(col => {
          const colJobs = jobs.filter(j => j.status === col.key)
          const isDragTarget = dragOver === col.key

          return (
            <div
              key={col.key}
              onDragOver={e => { e.preventDefault(); setDragOver(col.key) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => {
                if (dragId && can(session.role, 'editJob')) moveJob(dragId, col.key)
                setDragOver(null)
              }}
              style={{
                background: isDragTarget ? `${col.color}08` : 'var(--bg2)',
                border: `1px solid ${isDragTarget ? col.color + '50' : 'var(--border)'}`,
                borderRadius: 14,
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                transition: 'border-color 150ms, background 150ms',
                scrollSnapAlign: isMobile ? 'start' : undefined,
              } as React.CSSProperties}
            >
              {/* Column header */}
              <div style={{
                padding: '11px 14px 10px',
                borderBottom: `1px solid var(--border)`,
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: col.color, display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: col.color, flex: 1, letterSpacing: '.2px' }}>
                  {t(col.labelKey)}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: colJobs.length > 0 ? col.color : 'var(--text4)',
                  background: colJobs.length > 0 ? `${col.color}18` : 'var(--bg4)',
                  width: 22, height: 22, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {colJobs.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '8px 8px',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                {colJobs.length === 0 ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: '100%', minHeight: 100,
                    gap: 6, opacity: .4,
                  }}>
                    <span style={{ fontSize: 22 }}>{col.emptyIcon}</span>
                    <span style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 600 }}>No jobs</span>
                  </div>
                ) : (
                  colJobs.map(job => {
                    const priColor = PRIORITY_COLOR[job.priority] ?? 'var(--text4)'
                    const isPending = pendingIds.has(job.id)
                    const typeIcon = TYPE_ICON[job.type] ?? '🔧'

                    return (
                      <div
                        key={job.id}
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
                          borderLeft: `3px solid ${priColor}`,
                          opacity: dragId === job.id ? .5 : 1,
                          transition: 'box-shadow 120ms, transform 120ms',
                          animation: 'fadeIn .18s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.boxShadow = 'var(--shadow-card)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.boxShadow = 'none'
                          e.currentTarget.style.transform = 'none'
                        }}
                      >
                        {/* Pending sync dot */}
                        {isPending && (
                          <div style={{
                            position: 'absolute', top: 8, right: 8,
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'var(--amber)', animation: 'pulse 1.5s ease infinite',
                          }} title="Pending sync" />
                        )}

                        <div style={{ padding: '10px 12px 10px 10px' }}>
                          {/* Client name + type icon */}
                          <div style={{
                            display: 'flex', alignItems: 'flex-start',
                            gap: 6, marginBottom: 5,
                          }}>
                            <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{typeIcon}</span>
                            <div style={{
                              fontSize: 12, fontWeight: 700, color: 'var(--text)',
                              lineHeight: 1.3, flex: 1, minWidth: 0,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {job.client}
                            </div>
                          </div>

                          {/* Address */}
                          <div style={{
                            fontSize: 10, color: 'var(--text4)', marginBottom: 6,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            paddingLeft: 19,
                          }}>
                            {job.address.split(',')[0]}
                          </div>

                          {/* Footer: tech + priority */}
                          <div style={{
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', paddingLeft: 19,
                          }}>
                            {job.tech ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{
                                  width: 18, height: 18, borderRadius: '50%',
                                  background: 'var(--amber)', color: '#060a17',
                                  fontSize: 7, fontWeight: 900,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
                                  {job.tech.initials}
                                </div>
                                <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>
                                  {job.tech.name.split(' ')[0]}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: 10, color: 'var(--text4)', fontStyle: 'italic' }}>
                                {t('unassigned')}
                              </span>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {job.priority !== 'normal' && (
                                <span style={{
                                  fontSize: 9, fontWeight: 700, color: priColor,
                                  letterSpacing: '.3px',
                                }}>
                                  {PRIORITY_LABEL[job.priority]}
                                </span>
                              )}
                              {can(session.role, 'deleteJob') && (
                                <button
                                  onClick={e => { e.stopPropagation(); deleteJob(job.id) }}
                                  style={{
                                    background: 'transparent', border: 'none',
                                    cursor: 'pointer', fontSize: 11, color: 'var(--text4)',
                                    padding: '2px 3px', borderRadius: 4, lineHeight: 1,
                                    transition: 'color 120ms',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text4)'}
                                >
                                  🗑
                                </button>
                              )}
                            </div>
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
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)',
          zIndex: 1000, display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
        }} onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: isMobile ? '18px 18px 0 0' : 18,
            padding: isMobile ? '22px 18px 36px' : '28px 28px',
            width: isMobile ? '100%' : 520,
            animation: isMobile ? 'slideUp .25s ease' : 'fadeIn .2s ease',
            maxHeight: '92vh', overflowY: 'auto',
            boxShadow: 'var(--shadow-xl)',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.3px' }}>
                  {t('createWorkOrder')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>Fill in the details below</div>
              </div>
              <button onClick={() => setShowCreate(false)} style={{
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: '50%', width: 30, height: 30, cursor: 'pointer',
                fontSize: 14, color: 'var(--text4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {/* Form fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>
                    {t('client')} *
                  </label>
                  <input
                    value={form.client}
                    onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                    placeholder="Company or client name"
                    autoFocus
                    style={inp()}
                    onFocus={e => e.target.style.borderColor = 'var(--amber)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>
                    {t('jobType')}
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    style={inp()}
                  >
                    {['HVAC', 'Electrical', 'Plumbing', 'Refrigeration', 'Maintenance', 'Emergency'].map(jt => (
                      <option key={jt}>{jt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>
                  {t('address')} *
                </label>
                <input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Job site address"
                  style={inp()}
                  onFocus={e => e.target.style.borderColor = 'var(--amber)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>
                    {t('priority')}
                  </label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    style={inp({ borderLeft: `3px solid ${PRIORITY_COLOR[form.priority] ?? 'var(--text4)'}` })}
                  >
                    {(['low', 'normal', 'high', 'urgent'] as TKeys[]).map(p => (
                      <option key={p} value={p}>{t(p)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>
                    {t('assignTech')}
                  </label>
                  <select
                    value={form.techId}
                    onChange={e => setForm(f => ({ ...f, techId: e.target.value }))}
                    style={inp()}
                  >
                    <option value="">{t('unassigned')}</option>
                    {techs.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>
                  {t('description')}
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Issue details, notes for the tech…"
                  style={{ ...inp(), height: 72, resize: 'vertical' } as React.CSSProperties}
                  onFocus={e => e.target.style.borderColor = 'var(--amber)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button
                  onClick={() => setShowCreate(false)}
                  style={{
                    background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 9, color: 'var(--text3)', fontSize: 13, fontWeight: 600,
                    padding: '10px 18px', cursor: 'pointer',
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={createJob}
                  disabled={saving || !form.client || !form.address}
                  style={{
                    background: 'var(--amber)', color: '#060a17', border: 'none',
                    borderRadius: 9, fontSize: 13, fontWeight: 800,
                    padding: '10px 22px', cursor: 'pointer',
                    opacity: (saving || !form.client || !form.address) ? .5 : 1,
                    transition: 'opacity 140ms',
                  }}
                >
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
  )
}
