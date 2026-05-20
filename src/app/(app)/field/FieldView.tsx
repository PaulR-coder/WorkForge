'use client'

import { useState, useEffect, useRef } from 'react'
import type { SessionUser } from '@/lib/auth'
import { useLang } from '@/components/LangProvider'
import type { TKeys } from '@/lib/i18n'
import PaymentOverlay from '@/components/jobs/PaymentOverlay'
import { getPendingJobs, subscribePendingJobs, addPendingJob } from '@/lib/pendingJobs'

type Message = {
  id: string; body: string; createdAt: string
  author: { name: string; initials: string; role: string }
}

type Photo = {
  id: string; data: string; createdAt: string
  author: { name: string; initials: string }
}

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

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1200
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
    img.src = url
  })
}

export default function FieldView({ initialJobs, session }: {
  initialJobs: Job[]
  session: SessionUser
}) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set(getPendingJobs()))
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [paymentJob, setPaymentJob] = useState<{ id: string; client: string } | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [msgInput, setMsgInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [photos, setPhotos] = useState<Record<string, Photo[]>>({})
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const msgBottomRef = useRef<HTMLDivElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const { t } = useLang()

  useEffect(() => subscribePendingJobs(setPendingIds), [])

  // Fetch messages when a job is expanded, then poll every 15s
  useEffect(() => {
    if (!expandedId) return
    let cancelled = false

    async function fetchMessages() {
      const res = await fetch(`/api/jobs/${expandedId}/messages`)
      if (!res.ok || cancelled) return
      const data = await res.json()
      if (Array.isArray(data)) setMessages(prev => ({ ...prev, [expandedId!]: data }))
    }

    fetchMessages()
    const iv = setInterval(fetchMessages, 15000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [expandedId])

  // Fetch photos when a job is expanded
  useEffect(() => {
    if (!expandedId || photos[expandedId]) return
    fetch(`/api/jobs/${expandedId}/photos`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPhotos(prev => ({ ...prev, [expandedId!]: data })) })
      .catch(() => {})
  }, [expandedId, photos])

  // Scroll to latest message when thread loads or new message arrives
  useEffect(() => {
    msgBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [expandedId, messages])

  async function sendMessage() {
    if (!expandedId || !msgInput.trim() || sendingMsg) return
    setSendingMsg(true)
    const res = await fetch(`/api/jobs/${expandedId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: msgInput.trim() }),
    })
    if (res.ok) {
      const msg = await res.json()
      setMessages(prev => ({ ...prev, [expandedId]: [...(prev[expandedId] ?? []), msg] }))
      setMsgInput('')
    }
    setSendingMsg(false)
  }

  async function handlePhotoFile(file: File) {
    if (!expandedId || uploadingPhoto) return
    setUploadingPhoto(true)
    try {
      const data = await compressImage(file)
      const res = await fetch(`/api/jobs/${expandedId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, mimeType: 'image/jpeg' }),
      })
      if (res.ok) {
        const photo = await res.json()
        setPhotos(prev => ({ ...prev, [expandedId]: [...(prev[expandedId] ?? []), photo] }))
      }
    } catch {}
    setUploadingPhoto(false)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

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
      // 202 means the mutation was queued offline — mark the job as pending
      // so the tech sees it's not yet synced even if they reload the page.
      if (res.status === 202) {
        addPendingJob(job.id)
      }
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

      {/* Hidden file input for camera/gallery */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f) }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {orderedJobs.map(job => {
          const pc = PRIORITY_COLOR[job.priority]
          const isExpanded = expandedId === job.id
          const nextAction = STATUS_FLOW[job.status]
          const st = STATUS_LABEL[job.status] ?? { labelKey: job.status as TKeys, color: 'var(--text3)' }
          const jobPhotos = photos[job.id] ?? []

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {pendingIds.has(job.id) && (
                        <span title="Change pending sync" style={{ fontSize: 9, fontWeight: 700, color: 'var(--amber)', background: 'rgba(245,158,11,.12)', padding: '2px 6px', borderRadius: 10, border: '1px solid rgba(245,158,11,.25)' }}>
                          ↑ syncing
                        </span>
                      )}
                      <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: `${st.color}18`, padding: '3px 9px', borderRadius: 20, border: `1px solid ${st.color}33` }}>
                        {t(st.labelKey)}
                      </span>
                    </div>
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

                  {/* Message thread */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                      Notes & Messages {(messages[job.id]?.length ?? 0) > 0 ? `· ${messages[job.id].length}` : ''}
                    </div>
                    {(messages[job.id]?.length ?? 0) === 0 ? (
                      <div style={{ fontSize: 11, color: 'var(--text4)', fontStyle: 'italic', padding: '8px 0' }}>No messages yet</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', marginBottom: 8 }}>
                        {messages[job.id].map(m => {
                          const isMe = m.author.role === session.role && m.author.initials === session.initials
                          return (
                            <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                              <div style={{ width: 26, height: 26, borderRadius: '50%', background: isMe ? 'var(--amber)' : 'var(--bg4)', color: isMe ? '#080c1a' : 'var(--text3)', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {m.author.initials}
                              </div>
                              <div style={{ maxWidth: '75%' }}>
                                <div style={{ fontSize: 9, color: 'var(--text4)', marginBottom: 2, textAlign: isMe ? 'right' : 'left' }}>
                                  {m.author.name} · {new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </div>
                                <div style={{ fontSize: 12, padding: '8px 10px', borderRadius: isMe ? '10px 10px 2px 10px' : '10px 10px 10px 2px', background: isMe ? 'var(--amber)' : 'var(--bg3)', color: isMe ? '#080c1a' : 'var(--text)', border: isMe ? 'none' : '1px solid var(--border)', lineHeight: 1.4 }}>
                                  {m.body}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        <div ref={msgBottomRef} />
                      </div>
                    )}
                    {/* Reply box */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        value={msgInput}
                        onChange={e => setMsgInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
                        placeholder="Send a note…"
                        style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text)', fontSize: 12, padding: '9px 12px', outline: 'none', fontFamily: 'inherit' }}
                      />
                      <button onClick={sendMessage} disabled={!msgInput.trim() || sendingMsg}
                        style={{ padding: '9px 14px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: sendingMsg ? 'wait' : 'pointer', opacity: (!msgInput.trim() || sendingMsg) ? 0.5 : 1 }}>
                        {sendingMsg ? '…' : '↑'}
                      </button>
                    </div>
                  </div>

                  {/* Photo section */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                        Photos {jobPhotos.length > 0 ? `· ${jobPhotos.length}` : ''}
                      </div>
                      <button
                        onClick={() => { if (expandedId === job.id) photoInputRef.current?.click() }}
                        disabled={uploadingPhoto}
                        style={{ marginLeft: 'auto', padding: '4px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 11, fontWeight: 700, color: 'var(--text3)', cursor: uploadingPhoto ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: uploadingPhoto ? 0.6 : 1 }}
                      >
                        {uploadingPhoto ? '…' : '📷 Add'}
                      </button>
                    </div>
                    {jobPhotos.length === 0 ? (
                      <div style={{ fontSize: 11, color: 'var(--text4)', fontStyle: 'italic', padding: '4px 0 8px' }}>No photos yet</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        {jobPhotos.map(p => (
                          <div
                            key={p.id}
                            onClick={() => setLightboxSrc(p.data)}
                            style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: 'var(--bg3)' }}
                          >
                            <img src={p.data} alt="job photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
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

      {/* Photo lightbox */}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <img src={lightboxSrc} alt="full photo" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 10, objectFit: 'contain' }} />
          <button
            onClick={() => setLightboxSrc(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
