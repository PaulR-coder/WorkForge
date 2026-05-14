'use client'

import { useState } from 'react'
import type { SessionUser } from '@/lib/auth'
import { useLang } from '@/components/LangProvider'
import type { TKeys } from '@/lib/i18n'
import PaymentOverlay from '@/components/jobs/PaymentOverlay'

type Job = {
  id: string
  client: string
  address: string
  description: string
  type: string
  priority: string
  status: string
  createdAt: string
  tech: { id: string; name: string; initials: string } | null
}

const PRIORITY_COLOR: Record<string, string> = {
  low: 'var(--text4)', normal: '#5ba3f5', high: 'var(--amber)', urgent: 'var(--red)',
}

export default function FieldView({ initialJobs, session }: {
  initialJobs: Job[]
  session: SessionUser
}) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [paymentJob, setPaymentJob] = useState<{ id: string; client: string } | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const { t } = useLang()

  const STATUS_FLOW: Record<string, { next: string; label: string; color: string }> = {
    open:        { next: 'scheduled',   label: t('scheduleAction'),  color: 'var(--amber)'  },
    scheduled:   { next: 'in_progress', label: t('onMyWayAction'),   color: '#5ba3f5'       },
    in_progress: { next: 'done',        label: t('completeAction'),  color: 'var(--green)'  },
  }

  const STATUS_LABEL: Record<string, { labelKey: TKeys; color: string }> = {
    open:        { labelKey: 'open',        color: '#5ba3f5'        },
    scheduled:   { labelKey: 'scheduled',   color: 'var(--amber)'  },
    in_progress: { labelKey: 'inProgress',  color: 'var(--purple)' },
  }

  async function advanceStatus(job: Job) {
    const next = STATUS_FLOW[job.status]
    if (!next) return
    setLoading(job.id)
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next.next }),
    })
    if (res.ok) {
      if (next.next === 'done') {
        setJobs(prev => prev.filter(j => j.id !== job.id))
      } else {
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: next.next } : j))
      }
    }
    setLoading(null)
  }

  const grouped = {
    urgent: jobs.filter(j => j.priority === 'urgent'),
    high: jobs.filter(j => j.priority === 'high'),
    normal: jobs.filter(j => j.priority === 'normal'),
    low: jobs.filter(j => j.priority === 'low'),
  }

  const orderedJobs = [
    ...grouped.urgent, ...grouped.high, ...grouped.normal, ...grouped.low,
  ]

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 12px', minHeight: '100vh' }}>
      {/* Field header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
            {session.role === 'tech' ? t('myJobs') : t('fieldView')}
          </h1>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>
            {jobs.length} {t('activeTap')}
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--amber)', color: '#080c1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>
            {session.initials}
          </div>
        </div>
      </div>

      {/* Priority legend */}
      {(grouped.urgent.length > 0 || grouped.high.length > 0) && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {grouped.urgent.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(239,68,68,.12)', color: 'var(--red)', border: '1px solid rgba(239,68,68,.22)' }}>⚠ {grouped.urgent.length} {t('urgent')}</span>}
          {grouped.high.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(245,158,11,.1)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,.22)' }}>↑ {grouped.high.length} {t('high')}</span>}
        </div>
      )}

      {orderedJobs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text4)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>{t('allCaughtUp')}</div>
          <div style={{ fontSize: 12 }}>{t('noActiveJobs')}</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {orderedJobs.map(job => {
          const pc = PRIORITY_COLOR[job.priority]
          const isExpanded = expandedId === job.id
          const nextAction = STATUS_FLOW[job.status]
          const st = STATUS_LABEL[job.status] ?? { labelKey: job.status as TKeys, color: 'var(--text3)' }

          return (
            <div key={job.id} style={{ background: 'var(--bg2)', border: `1px solid ${job.priority === 'urgent' ? 'rgba(239,68,68,.3)' : job.priority === 'high' ? 'rgba(245,158,11,.25)' : 'var(--border)'}`, borderRadius: 14, overflow: 'hidden' }}>
              {/* Job card header — always visible */}
              <div onClick={() => setExpandedId(isExpanded ? null : job.id)}
                style={{ padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{job.client}</div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: pc, background: `${pc}18`, padding: '2px 7px', borderRadius: 20 }}>{t(job.priority as TKeys)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text4)' }}>{job.type} · {job.address.split(',')[0]}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: `${st.color}18`, padding: '3px 9px', borderRadius: 20, border: `1px solid ${st.color}33` }}>
                      {t(st.labelKey)}
                    </span>
                    <div style={{ fontSize: 14, color: 'var(--text4)' }}>{isExpanded ? '▲' : '▼'}</div>
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ paddingTop: 12, marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{t('fullAddressLabel')}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>{job.address}</div>
                    {job.description && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{t('jobNotes')}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>{job.description}</div>
                      </>
                    )}
                  </div>

                  {/* Map link */}
                  <a href={`https://maps.apple.com/?q=${encodeURIComponent(job.address)}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, textDecoration: 'none' }}>
                    <span style={{ fontSize: 18 }}>📍</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{t('openInMaps')}</div>
                      <div style={{ fontSize: 10, color: 'var(--text4)' }}>{job.address}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--text4)' }}>→</span>
                  </a>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {nextAction && (
                      <button
                        onClick={() => advanceStatus(job)}
                        disabled={loading === job.id}
                        style={{
                          flex: 1, padding: '13px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                          background: nextAction.color, color: job.status === 'in_progress' ? '#fff' : '#080c1a',
                          fontSize: 13, fontWeight: 800, opacity: loading === job.id ? 0.6 : 1,
                        }}>
                        {loading === job.id ? t('updating') : nextAction.label}
                      </button>
                    )}
                    <button
                      onClick={() => setPaymentJob({ id: job.id, client: job.client })}
                      style={{ padding: '13px 14px', borderRadius: 10, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.25)', color: 'var(--green)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      💳
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

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
