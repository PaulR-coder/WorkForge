'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SessionUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { useLang } from '@/components/LangProvider'
import type { TKeys } from '@/lib/i18n'
import JobDrawer from './JobDrawer'
import PaymentOverlay from './PaymentOverlay'

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

const COLUMNS: { key: string; labelKey: TKeys; color: string }[] = [
  { key: 'open',        labelKey: 'open',        color: '#5ba3f5'       },
  { key: 'scheduled',   labelKey: 'scheduled',   color: 'var(--amber)'  },
  { key: 'in_progress', labelKey: 'inProgress',  color: 'var(--purple)' },
  { key: 'done',        labelKey: 'done',        color: 'var(--green)'  },
]

const PRIORITY_COLOR: Record<string, string> = {
  low: 'var(--text4)', normal: '#5ba3f5', high: 'var(--amber)', urgent: 'var(--red)',
}

export default function JobsBoard({ initialJobs, users, session }: {
  initialJobs: Job[]
  users: User[]
  session: SessionUser
}) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ client: '', address: '', type: 'HVAC', priority: 'normal', description: '', techId: '' })
  const [saving, setSaving] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [drawerJobId, setDrawerJobId] = useState<string | null>(null)
  const [paymentJob, setPaymentJob] = useState<{ id: string; client: string } | null>(null)
  const [lastSync, setLastSync] = useState(Date.now())
  const { t } = useLang()

  const pollJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs')
      if (res.ok) {
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
    await fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
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
    }
    setSaving(false)
  }

  async function deleteJob(id: string) {
    if (!confirm(t('deleteJob'))) return
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  function handleJobUpdate(updated: { id: string; status: string; tech: Job['tech'] }) {
    setJobs(prev => prev.map(j => j.id === updated.id ? { ...j, ...updated } : j))
  }

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text)', fontSize: 12, padding: '8px 10px', outline: 'none', fontFamily: 'inherit',
    ...style,
  })

  const timeSince = Math.round((Date.now() - lastSync) / 1000)

  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{t('workOrders')}</h1>
        {COLUMNS.map(col => (
          <span key={col.key} style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: `${col.color}18`, color: col.color, border: `1px solid ${col.color}33` }}>
            {jobs.filter(j => j.status === col.key).length} {t(col.labelKey)}
          </span>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--text4)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2s ease infinite' }} />
            {timeSince < 5 ? t('syncedJustNow') : `${t('synced')} ${timeSince}s ${t('syncedAgo')}`}
          </span>
          {can(session.role, 'createJob') && (
            <button onClick={() => setShowCreate(true)}
              style={{ background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, padding: '8px 14px', cursor: 'pointer' }}>
              {t('newJob')}
            </button>
          )}
        </div>
      </div>

      {/* Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, flex: 1, overflow: 'hidden' }}>
        {COLUMNS.map(col => (
          <div key={col.key}
            onDragOver={e => e.preventDefault()}
            onDrop={() => { if (dragId && can(session.role, 'editJob')) moveJob(dragId, col.key) }}
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: col.color }}>{t(col.labelKey)}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--text4)' }}>{jobs.filter(j => j.status === col.key).length}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {jobs.filter(j => j.status === col.key).map(job => (
                <div key={job.id}
                  draggable={can(session.role, 'editJob')}
                  onDragStart={() => setDragId(job.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => setDrawerJobId(job.id)}
                  style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 9, padding: 10, cursor: 'pointer', animation: 'fadeIn .2s ease', transition: 'border-color .15s' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{job.client}</div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: PRIORITY_COLOR[job.priority], background: `${PRIORITY_COLOR[job.priority]}18`, padding: '2px 6px', borderRadius: 10, flexShrink: 0, marginLeft: 6 }}>
                      {t(job.priority as TKeys)}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text4)', marginBottom: 6 }}>{job.type} · {job.address.split(',')[0]}</div>
                  {job.description && <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6, lineHeight: 1.4 }}>{job.description.slice(0, 80)}{job.description.length > 80 ? '...' : ''}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {job.tech ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--amber)', color: '#080c1a', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {job.tech.initials}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{job.tech.name.split(' ')[0]}</span>
                      </div>
                    ) : <span style={{ fontSize: 10, color: 'var(--text4)' }}>{t('unassigned')}</span>}
                    {can(session.role, 'deleteJob') && (
                      <button onClick={e => { e.stopPropagation(); deleteJob(job.id) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text4)', padding: '2px 4px' }}>🗑</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, width: 480, animation: 'fadeIn .2s ease' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>{t('createWorkOrder')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{t('client')} *</label>
                <input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} placeholder={t('clientName')} style={inp()} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{t('jobType')}</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inp()}>
                  {['HVAC', 'Electrical', 'Plumbing', 'Refrigeration', 'Maintenance', 'Emergency'].map(jt => <option key={jt}>{jt}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{t('address')} *</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder={t('jobSiteAddress')} style={inp()} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{t('priority')}</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inp()}>
                  {(['low', 'normal', 'high', 'urgent'] as TKeys[]).map(p => <option key={p} value={p}>{t(p)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{t('assignTech')}</label>
                <select value={form.techId} onChange={e => setForm(f => ({ ...f, techId: e.target.value }))} style={inp()}>
                  <option value="">{t('unassigned')}</option>
                  {users.filter(u => u.role === 'tech').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{t('description')}</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t('jobDetails')} style={{ ...inp(), height: 60, resize: 'vertical' } as React.CSSProperties} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text3)', fontSize: 12, padding: '8px 14px', cursor: 'pointer' }}>{t('cancel')}</button>
              <button onClick={createJob} disabled={saving || !form.client || !form.address}
                style={{ background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, padding: '8px 16px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? t('creating') : t('createJob')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Drawer */}
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

      {/* Payment Overlay */}
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
