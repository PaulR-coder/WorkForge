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

type TimeEntry = {
  id: string
  startedAt: string
  endedAt: string | null
  minutes: number | null
  tech: { name: string; initials: string }
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
  low: 'var(--text4)', normal: 'var(--blue-light)', high: 'var(--amber)', urgent: 'var(--red)',
}

const PRIORITY_BG: Record<string, string> = {
  low: 'rgba(86,104,130,.15)', normal: 'rgba(91,163,245,.12)', high: 'rgba(245,158,11,.12)', urgent: 'rgba(239,68,68,.12)',
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

// SVG icons as components
function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function WifiOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>
  )
}

function MapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/>
      <line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  )
}

function CardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
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
  const [onDuty, setOnDuty] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [timeEntries, setTimeEntries] = useState<Record<string, TimeEntry[]>>({})
  const [clockingIn, setClockingIn] = useState(false)
  const [tick, setTick] = useState(0)
  const [isOffline, setIsOffline] = useState(false)
  const msgBottomRef  = useRef<HTMLDivElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const watchIdRef    = useRef<number | null>(null)
  const lastSentRef   = useRef<{ lat: number; lng: number; at: number } | null>(null)
  const { t } = useLang()

  useEffect(() => subscribePendingJobs(setPendingIds), [])

  // Track online/offline state
  useEffect(() => {
    const handleOffline = () => setIsOffline(true)
    const handleOnline  = () => setIsOffline(false)
    setIsOffline(!navigator.onLine)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  // Restore On Duty state + watch from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return
    const stored = localStorage.getItem('wf-on-duty') === '1'
    if (!stored) return
    setOnDuty(true)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, maximumAge: 30_000 },
    )
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function sendLocation(lat: number, lng: number) {
    const last = lastSentRef.current
    const now  = Date.now()
    if (last && now - last.at < 60_000 && Math.abs(lat - last.lat) < 0.0004 && Math.abs(lng - last.lng) < 0.0004) return
    lastSentRef.current = { lat, lng, at: now }
    fetch('/api/users/me/location', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    }).catch(() => {})
  }

  async function toggleOnDuty() {
    if (onDuty) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      lastSentRef.current = null
      localStorage.removeItem('wf-on-duty')
      setOnDuty(false)
      setGeoError(null)
      fetch('/api/users/me/location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharing: false }),
      }).catch(() => {})
    } else {
      if (!navigator.geolocation) { setGeoError('Geolocation not supported on this device'); return }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          sendLocation(pos.coords.latitude, pos.coords.longitude)
          watchIdRef.current = navigator.geolocation.watchPosition(
            (p) => sendLocation(p.coords.latitude, p.coords.longitude),
            () => {},
            { enableHighAccuracy: true, maximumAge: 30_000 },
          )
          localStorage.setItem('wf-on-duty', '1')
          setOnDuty(true)
          setGeoError(null)
        },
        (err) => {
          setGeoError(err.code === 1 ? 'Location permission denied — enable it in browser settings' : 'Could not get your location')
        },
        { timeout: 10_000 },
      )
    }
  }

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

  useEffect(() => {
    if (!expandedId || photos[expandedId]) return
    fetch(`/api/jobs/${expandedId}/photos`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPhotos(prev => ({ ...prev, [expandedId!]: data })) })
      .catch(() => {})
  }, [expandedId, photos])

  useEffect(() => {
    if (!expandedId) return
    fetch(`/api/jobs/${expandedId}/time`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTimeEntries(prev => ({ ...prev, [expandedId!]: data })) })
      .catch(() => {})
  }, [expandedId])

  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

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
    if (res.status === 202) {
      setMsgInput('')
    } else if (res.ok) {
      const msg = await res.json()
      setMessages(prev => ({ ...prev, [expandedId]: [...(prev[expandedId] ?? []), msg] }))
      setMsgInput('')
    }
    setSendingMsg(false)
  }

  async function toggleClock(jobId: string) {
    if (clockingIn) return
    setClockingIn(true)
    const entries = timeEntries[jobId] ?? []
    const open = entries.find(e => !e.endedAt)
    const action = open ? 'stop' : 'start'
    try {
      const res = await fetch(`/api/jobs/${jobId}/time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const updated = await res.json()
        setTimeEntries(prev => {
          const existing = prev[jobId] ?? []
          if (action === 'stop') {
            return { ...prev, [jobId]: existing.map(e => e.id === updated.id ? updated : e) }
          }
          return { ...prev, [jobId]: [...existing, updated] }
        })
      }
    } catch {}
    setClockingIn(false)
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
      if (res.ok && res.status !== 202) {
        const photo = await res.json()
        setPhotos(prev => ({ ...prev, [expandedId]: [...(prev[expandedId] ?? []), photo] }))
      }
    } catch {}
    setUploadingPhoto(false)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const STATUS_FLOW: Record<string, { next: string; label: string; color: string }> = {
    open:        { next: 'scheduled',   label: t('scheduleAction'),  color: 'var(--amber)'      },
    scheduled:   { next: 'in_progress', label: t('onMyWayAction'),   color: 'var(--blue-light)' },
    in_progress: { next: 'done',        label: t('completeAction'),  color: 'var(--green)'      },
  }

  const STATUS_LABEL: Record<string, { labelKey: TKeys; color: string }> = {
    open:        { labelKey: 'open',        color: 'var(--blue-light)' },
    scheduled:   { labelKey: 'scheduled',   color: 'var(--amber)'     },
    in_progress: { labelKey: 'inProgress',  color: 'var(--purple)'    },
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
    high:   jobs.filter(j => j.priority === 'high'),
    normal: jobs.filter(j => j.priority === 'normal'),
    low:    jobs.filter(j => j.priority === 'low'),
  }

  const orderedJobs = [
    ...grouped.urgent, ...grouped.high, ...grouped.normal, ...grouped.low,
  ]

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>

      {/* Offline banner */}
      {isOffline && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 16px',
          background: 'rgba(245,158,11,.15)',
          borderBottom: '1px solid var(--amber-border)',
          color: 'var(--amber)',
          fontSize: 13, fontWeight: 600,
        }}>
          <WifiOffIcon />
          <span>You&apos;re offline — changes will sync when reconnected</span>
        </div>
      )}

      <div style={{ padding: '20px 14px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: geoError ? 10 : 20 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: 26, fontWeight: 800, color: 'var(--text)',
              fontFamily: 'var(--font-display)', letterSpacing: .3,
              lineHeight: 1.1, marginBottom: 3,
            }}>
              {session.name ?? (session.role === 'tech' ? t('myJobs') : t('fieldView'))}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>
                {session.role}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text4)' }}>·</span>
              <span style={{ fontSize: 12, color: 'var(--text4)' }}>
                {jobs.length} {t('activeTap')}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* On-duty pill toggle */}
            {session.role === 'tech' && (
              <button
                onClick={toggleOnDuty}
                aria-label={onDuty ? 'Go off duty' : 'Go on duty'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  padding: 0, borderRadius: 999, border: '1.5px solid',
                  cursor: 'pointer', transition: 'all .2s',
                  background: onDuty ? 'rgba(34,197,94,.12)' : 'var(--bg3)',
                  borderColor: onDuty ? 'rgba(34,197,94,.4)' : 'var(--border)',
                  overflow: 'hidden',
                  minHeight: 36,
                }}
              >
                {/* Track */}
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '0 10px 0 8px',
                  fontSize: 11, fontWeight: 800,
                  color: onDuty ? 'var(--green)' : 'var(--text4)',
                  letterSpacing: .3,
                }}>
                  {/* Thumb */}
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: onDuty ? 'var(--green)' : 'var(--text4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background .2s',
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: onDuty ? 'var(--bg)' : 'var(--bg2)',
                      animation: onDuty ? 'pulse 2s ease infinite' : 'none',
                    }} />
                  </span>
                  {onDuty ? 'On Duty' : 'Off Duty'}
                </span>
              </button>
            )}

            {/* Avatar */}
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--amber)', color: '#080c1a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 800, flexShrink: 0,
              fontFamily: 'var(--font-display)', letterSpacing: .5,
              boxShadow: '0 0 0 2.5px rgba(245,158,11,.3)',
            }}>
              {session.initials}
            </div>
          </div>
        </div>

        {/* Geolocation error */}
        {geoError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 14px',
            background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)',
            borderRadius: 10, marginBottom: 16,
            fontSize: 13, color: '#fca5a5',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span style={{ flex: 1 }}>{geoError}</span>
            <button onClick={() => setGeoError(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Priority legend */}
        {(grouped.urgent.length > 0 || grouped.high.length > 0) && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {grouped.urgent.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: 'rgba(239,68,68,.12)', color: 'var(--red)', border: '1px solid rgba(239,68,68,.22)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                {grouped.urgent.length} {t('urgent')}
              </span>
            )}
            {grouped.high.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20, background: 'rgba(245,158,11,.1)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,.22)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                {grouped.high.length} {t('high')}
              </span>
            )}
          </div>
        )}

        {/* Empty state */}
        {orderedJobs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '72px 24px 40px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <CheckCircleIcon />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: .3, marginBottom: 8 }}>
              {t('allCaughtUp')}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text4)', lineHeight: 1.6 }}>{t('noActiveJobs')}</div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f) }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orderedJobs.map(job => {
            const pc = PRIORITY_COLOR[job.priority]
            const pb = PRIORITY_BG[job.priority]
            const isExpanded = expandedId === job.id
            const nextAction = STATUS_FLOW[job.status]
            const st = STATUS_LABEL[job.status] ?? { labelKey: job.status as TKeys, color: 'var(--text3)' }
            const jobPhotos = photos[job.id] ?? []
            const isUrgent = job.priority === 'urgent'
            const isHigh = job.priority === 'high'

            return (
              <div
                key={job.id}
                style={{
                  background: 'var(--bg2)',
                  border: `1px solid ${isUrgent ? 'rgba(239,68,68,.3)' : isHigh ? 'rgba(245,158,11,.25)' : 'var(--border)'}`,
                  borderRadius: 16, overflow: 'hidden',
                  boxShadow: isUrgent ? '0 4px 20px rgba(239,68,68,.08)' : 'none',
                  display: 'flex', flexDirection: 'row',
                }}
              >
                {/* Priority stripe */}
                <div style={{
                  width: 4, flexShrink: 0,
                  background: pc,
                  borderRadius: '16px 0 0 16px',
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Job card header */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : job.id)}
                    style={{ padding: '16px 16px 14px', cursor: 'pointer', userSelect: 'none', minHeight: 72, display: 'flex', alignItems: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Client name — large, bold */}
                        <div style={{
                          fontSize: 17, fontWeight: 800, color: 'var(--text)',
                          fontFamily: 'var(--font-display)', letterSpacing: .2,
                          marginBottom: 5, lineHeight: 1.2,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {job.client}
                        </div>
                        {/* Address with pin icon */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text4)', marginBottom: 6 }}>
                          <span style={{ flexShrink: 0 }}><PinIcon /></span>
                          <span style={{ fontSize: 12, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {job.address.split(',')[0]}
                          </span>
                        </div>
                        {/* Job type badge */}
                        <span style={{
                          display: 'inline-block',
                          fontSize: 10, fontWeight: 800,
                          color: pc, background: pb,
                          padding: '3px 9px', borderRadius: 20,
                          textTransform: 'uppercase', letterSpacing: .6,
                        }}>
                          {job.type}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {pendingIds.has(job.id) && (
                            <span style={{
                              fontSize: 9, fontWeight: 700,
                              color: 'var(--amber)', background: 'rgba(245,158,11,.12)',
                              padding: '2px 6px', borderRadius: 10,
                              border: '1px solid rgba(245,158,11,.25)',
                            }}>
                              syncing
                            </span>
                          )}
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: st.color, background: `${st.color}1a`,
                            padding: '4px 10px', borderRadius: 20,
                            border: `1px solid ${st.color}33`,
                            whiteSpace: 'nowrap',
                          }}>
                            {t(st.labelKey)}
                          </span>
                        </div>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="var(--text4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)' }}>

                      {/* Address + notes */}
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }}>
                          {t('fullAddressLabel')}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: job.description ? 12 : 0 }}>{job.address}</div>
                        {job.description && (
                          <>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }}>
                              {t('jobNotes')}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, background: 'var(--bg3)', borderRadius: 10, padding: '11px 13px' }}>
                              {job.description}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Message thread */}
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
                          Notes & Messages {(messages[job.id]?.length ?? 0) > 0 ? `· ${messages[job.id].length}` : ''}
                        </div>
                        {(messages[job.id]?.length ?? 0) === 0 ? (
                          <div style={{ fontSize: 12, color: 'var(--text4)', fontStyle: 'italic', padding: '4px 0 8px' }}>No messages yet</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', marginBottom: 10 }}>
                            {messages[job.id].map(m => {
                              const isMe = m.author.role === session.role && m.author.initials === session.initials
                              return (
                                <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                  <div style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: isMe ? 'var(--amber)' : 'var(--bg4)',
                                    color: isMe ? '#080c1a' : 'var(--text3)',
                                    fontSize: 9, fontWeight: 800,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, fontFamily: 'var(--font-display)',
                                  }}>
                                    {m.author.initials}
                                  </div>
                                  <div style={{ maxWidth: '75%' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text4)', marginBottom: 3, textAlign: isMe ? 'right' : 'left' }}>
                                      {m.author.name} · {new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                    </div>
                                    <div style={{
                                      fontSize: 13, padding: '9px 12px',
                                      borderRadius: isMe ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                                      background: isMe ? 'var(--amber)' : 'var(--bg3)',
                                      color: isMe ? '#080c1a' : 'var(--text)',
                                      border: isMe ? 'none' : '1px solid var(--border)',
                                      lineHeight: 1.5,
                                    }}>
                                      {m.body}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                            <div ref={msgBottomRef} />
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            value={msgInput}
                            onChange={e => setMsgInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
                            placeholder="Send a note…"
                            style={{
                              flex: 1, background: 'var(--bg3)',
                              border: '1px solid var(--border)', borderRadius: 10,
                              color: 'var(--text)', fontSize: 14, padding: '11px 13px',
                              outline: 'none', fontFamily: 'var(--font-body)',
                              minHeight: 44,
                            }}
                          />
                          <button
                            onClick={sendMessage}
                            disabled={!msgInput.trim() || sendingMsg}
                            style={{
                              width: 44, height: 44,
                              background: 'var(--amber)', color: '#080c1a',
                              border: 'none', borderRadius: 10,
                              fontSize: 18, cursor: sendingMsg ? 'wait' : 'pointer',
                              opacity: (!msgInput.trim() || sendingMsg) ? 0.5 : 1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Time tracking */}
                      {(() => {
                        const entries = timeEntries[job.id] ?? []
                        const open = entries.find(e => !e.endedAt)
                        const totalMin = entries.reduce((s, e) => s + (e.minutes ?? 0), 0)
                        void tick
                        const liveSec = open ? Math.floor((Date.now() - new Date(open.startedAt).getTime()) / 1000) : 0
                        const liveMin = Math.floor(liveSec / 60)
                        const liveSecs = liveSec % 60
                        return (
                          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: open ? 10 : 0 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: .5 }}>
                                  Time on Job {totalMin > 0 && !open ? `· ${Math.floor(totalMin / 60)}h ${totalMin % 60}m` : ''}
                                </div>
                              </div>
                              <button
                                onClick={() => toggleClock(job.id)}
                                disabled={clockingIn}
                                style={{
                                  padding: '9px 16px', borderRadius: 22, border: '1.5px solid',
                                  background: open ? 'rgba(239,68,68,.1)' : 'rgba(34,197,94,.1)',
                                  borderColor: open ? 'rgba(239,68,68,.3)' : 'rgba(34,197,94,.3)',
                                  color: open ? 'var(--red)' : 'var(--green)',
                                  fontSize: 12, fontWeight: 800, cursor: clockingIn ? 'wait' : 'pointer',
                                  minHeight: 44, display: 'flex', alignItems: 'center', gap: 6,
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                  {open
                                    ? <rect x="6" y="6" width="12" height="12" rx="1"/>
                                    : <polygon points="5 3 19 12 5 21 5 3"/>}
                                </svg>
                                {open ? 'Clock Out' : 'Clock In'}
                              </button>
                            </div>
                            {open && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                                  {String(liveMin).padStart(2, '0')}:{String(liveSecs).padStart(2, '0')}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--text4)' }}>running</span>
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      {/* Photo section */}
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: .5 }}>
                            Photos {jobPhotos.length > 0 ? `· ${jobPhotos.length}` : ''}
                          </div>
                          <button
                            onClick={() => { if (expandedId === job.id) photoInputRef.current?.click() }}
                            disabled={uploadingPhoto}
                            style={{
                              marginLeft: 'auto',
                              padding: '8px 14px', borderRadius: 10,
                              background: 'var(--amber-dim)', border: '1px solid var(--amber-border)',
                              fontSize: 12, fontWeight: 700, color: 'var(--amber)',
                              cursor: uploadingPhoto ? 'wait' : 'pointer',
                              display: 'flex', alignItems: 'center', gap: 6,
                              opacity: uploadingPhoto ? 0.6 : 1,
                              minHeight: 36,
                            }}
                          >
                            <CameraIcon />
                            {uploadingPhoto ? 'Uploading…' : 'Add Photo'}
                          </button>
                        </div>
                        {jobPhotos.length === 0 ? (
                          <button
                            onClick={() => { if (expandedId === job.id) photoInputRef.current?.click() }}
                            disabled={uploadingPhoto}
                            style={{
                              width: '100%', padding: '22px 16px',
                              background: 'transparent',
                              border: '2px dashed var(--border)',
                              borderRadius: 12, cursor: 'pointer',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                              color: 'var(--text4)',
                            }}
                          >
                            <CameraIcon />
                            <span style={{ fontSize: 12, fontWeight: 600 }}>Tap to add a photo</span>
                          </button>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {jobPhotos.map(p => (
                              <div
                                key={p.id}
                                onClick={() => setLightboxSrc(p.data)}
                                style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: 'var(--bg3)' }}
                              >
                                <img src={p.data} alt="job photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Map link */}
                      <a
                        href={`https://maps.apple.com/?q=${encodeURIComponent(job.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '14px 16px',
                          borderBottom: '1px solid var(--border)',
                          textDecoration: 'none',
                          color: 'var(--text2)',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                          background: 'rgba(91,163,245,.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--blue-light)',
                        }}>
                          <MapIcon />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 2 }}>{t('openInMaps')}</div>
                          <div style={{ fontSize: 11, color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.address}</div>
                        </div>
                        <ArrowRightIcon />
                      </a>

                      {/* Action buttons */}
                      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* Complete / Mark Complete — most prominent */}
                        {nextAction && (
                          <button
                            onClick={() => advanceStatus(job)}
                            disabled={loading === job.id}
                            style={{
                              width: '100%', minHeight: 52,
                              borderRadius: 12, border: 'none', cursor: 'pointer',
                              background: nextAction.color,
                              color: job.status === 'in_progress' ? '#fff' : '#080c1a',
                              fontSize: 15, fontWeight: 800,
                              opacity: loading === job.id ? 0.6 : 1,
                              fontFamily: 'var(--font-display)', letterSpacing: .4,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}
                          >
                            {loading === job.id
                              ? t('updating')
                              : (
                                <>
                                  {job.status === 'in_progress' && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  )}
                                  {nextAction.label}
                                </>
                              )
                            }
                          </button>
                        )}
                        {/* Collect payment button */}
                        <button
                          onClick={() => setPaymentJob({ id: job.id, client: job.client })}
                          style={{
                            width: '100%', minHeight: 48,
                            borderRadius: 12,
                            background: 'rgba(34,197,94,.1)',
                            border: '1.5px solid rgba(34,197,94,.3)',
                            color: 'var(--green)',
                            fontSize: 14, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          }}
                        >
                          <CardIcon />
                          Collect Payment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.94)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <img src={lightboxSrc} alt="full photo" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, objectFit: 'contain' }} />
          <button
            onClick={() => setLightboxSrc(null)}
            style={{
              position: 'absolute', top: 18, right: 18,
              background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.15)',
              borderRadius: '50%', width: 40, height: 40,
              cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
      `}</style>
    </div>
  )
}
