'use client'

import { useEffect, useState } from 'react'

type TechJob = {
  id: string
  client: string
  type: string
  address: string
  status: string
  priority: string
  scheduledAt: string | null
}

type Tech = {
  id: string
  name: string
  initials: string
  role: string
  specialty: string
}

const STATUS_COLOR: Record<string, string> = {
  open: '#5ba3f5', scheduled: '#f59e0b', in_progress: '#a78bfa', done: '#22c55e',
}
const STATUS_LABEL: Record<string, string> = {
  open: 'Open', scheduled: 'Scheduled', in_progress: 'In Progress', done: 'Done',
}

export default function TechJobsPanel({ tech, onClose }: { tech: Tech; onClose: () => void }) {
  const [jobs, setJobs] = useState<TechJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/jobs?techId=${tech.id}`, { signal: controller.signal })
      .then(r => { if (!r.ok) return []; return r.json() })
      .then((data: unknown) => {
        if (!Array.isArray(data)) return
        const sorted = [...data].sort((a, b) => {
          if (a.scheduledAt && b.scheduledAt) return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
          if (a.scheduledAt) return -1
          if (b.scheduledAt) return 1
          return 0
        })
        setJobs(sorted as TechJob[])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [tech.id])

  const upcomingJobs = jobs.filter(j => j.status !== 'done')
  const doneJobs     = jobs.filter(j => j.status === 'done').slice(0, 3)

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(6,10,23,.5)', backdropFilter: 'blur(4px)', zIndex: 600 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 340,
        background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
        zIndex: 601, display: 'flex', flexDirection: 'column',
        animation: 'slideInRight .2s var(--ease)', boxShadow: 'var(--shadow-xl)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: 'var(--amber)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#060a17', flexShrink: 0,
          }}>
            {tech.initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{tech.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2, textTransform: 'capitalize' }}>
              {tech.role}{tech.specialty ? ` · ${tech.specialty}` : ''}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: 'var(--text4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text4)', fontSize: 13 }}>Loading jobs…</div>
          ) : upcomingJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>No active jobs</div>
              <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 4 }}>This technician has no open or scheduled work</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '1.1px', marginBottom: 10 }}>
                Active Jobs ({upcomingJobs.length})
              </div>
              {upcomingJobs.map(job => {
                const statusColor = STATUS_COLOR[job.status] ?? 'var(--text4)'
                return (
                  <div key={job.id} style={{
                    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
                    padding: '12px 14px', marginBottom: 8,
                  }}>
                    {job.scheduledAt && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', marginBottom: 5 }}>
                        ⏰ {new Date(job.scheduledAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                      </div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{job.client}</div>
                    <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 8 }}>{job.type} · {job.address}</div>
                    <div style={{
                      display: 'inline-flex', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                      background: `${statusColor}18`, color: statusColor,
                      border: `1px solid ${statusColor}28`, textTransform: 'uppercase', letterSpacing: '.4px',
                    }}>
                      {STATUS_LABEL[job.status] ?? job.status}
                    </div>
                  </div>
                )
              })}
              {doneJobs.length > 0 && (
                <>
                  <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '1.1px', margin: '16px 0 8px' }}>
                    Recently Completed
                  </div>
                  {doneJobs.map(job => (
                    <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', opacity: 0.6 }}>
                      <span style={{ fontSize: 14 }}>✓</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.client}</div>
                        <div style={{ fontSize: 11, color: 'var(--text4)' }}>{job.type}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
