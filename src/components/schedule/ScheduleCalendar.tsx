'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SessionUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { useLang } from '@/components/LangProvider'
import { useIsMobile } from '@/lib/useIsMobile'
import JobDrawer from '@/components/jobs/JobDrawer'
import PaymentOverlay from '@/components/jobs/PaymentOverlay'

type CalJob = {
  id: string
  client: string
  address: string
  type: string
  priority: string
  status: string
  scheduledAt: string | null
  techId: string | null
  tech: { id: string; name: string; initials: string } | null
}

type CalUser = { id: string; name: string; initials: string; role: string }

// 7 AM – 8 PM (inclusive)
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)

const PRIORITY_COLOR: Record<string, string> = {
  low: '#6b7280',
  normal: '#5ba3f5',
  high: '#f59e0b',
  urgent: '#ef4444',
}

const TECH_PALETTE = [
  '#f59e0b', '#5ba3f5', '#10b981', '#8b5cf6',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316',
]

const DAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function getWeekStart(d: Date): Date {
  const c = new Date(d)
  c.setDate(c.getDate() - c.getDay())
  c.setHours(0, 0, 0, 0)
  return c
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function fmtHour(h: number): string {
  if (h === 12) return '12 PM'
  if (h > 12) return `${h - 12} PM`
  return `${h} AM`
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// SVG chevron icons
function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ScheduleCalendar({
  session,
  users,
}: {
  session: SessionUser
  users: CalUser[]
}) {
  const [jobs, setJobs] = useState<CalJob[]>([])
  const [wStart, setWStart] = useState<Date>(() => getWeekStart(new Date()))
  const [openJobId, setOpenJobId] = useState<string | null>(null)
  const [payJob, setPayJob] = useState<{ id: string; client: string } | null>(null)
  const [filterTechId, setFilterTechId] = useState('all')
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropHover, setDropHover] = useState<string | null>(null)
  const [mobileDay, setMobileDay] = useState<number>(() => new Date().getDay())
  const { t, lang } = useLang()
  const isMobile = useIsMobile()

  const loadJobs = useCallback(() => {
    fetch('/api/jobs')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setJobs(d) })
  }, [])

  useEffect(() => {
    loadJobs()
    const iv = setInterval(loadJobs, 15000)
    return () => clearInterval(iv)
  }, [loadJobs])

  const techs = users.filter(u => u.role === 'tech')
  const techColor: Record<string, string> = Object.fromEntries(
    techs.map((u, i) => [u.id, TECH_PALETTE[i % TECH_PALETTE.length]])
  )

  const today = new Date()
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(wStart, i))
  const weekEndMs = addDays(wStart, 7).getTime()
  const dayLabels = lang === 'es' ? DAY_ES : DAY_EN

  const baseJobs = filterTechId === 'all'
    ? jobs
    : jobs.filter(j => j.techId === filterTechId)

  const unscheduled = baseJobs.filter(j => !j.scheduledAt && j.status !== 'done')
  const thisWeek = baseJobs.filter(j => {
    if (!j.scheduledAt || j.status === 'done') return false
    const ms = new Date(j.scheduledAt).getTime()
    return ms >= wStart.getTime() && ms < weekEndMs
  })

  function slotJobs(dayIdx: number, hour: number): CalJob[] {
    return thisWeek.filter(j => {
      const d = new Date(j.scheduledAt!)
      return isSameDay(d, weekDays[dayIdx]) && d.getHours() === hour
    })
  }

  async function patchSchedule(jobId: string, scheduledAt: Date | null) {
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
        status: scheduledAt ? 'scheduled' : 'open',
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setJobs(prev => prev.map(j =>
        j.id === jobId
          ? { ...j, scheduledAt: updated.scheduledAt ?? null, status: updated.status, tech: updated.tech }
          : j
      ))
    }
  }

  function handleDrop(e: React.DragEvent, dayIdx: number, hour: number) {
    e.preventDefault()
    const jobId = e.dataTransfer.getData('jobId')
    if (!jobId || !can(session.role, 'editJob')) return
    const dt = new Date(weekDays[dayIdx])
    dt.setHours(hour, 0, 0, 0)
    patchSchedule(jobId, dt)
    setDropHover(null)
    setDragging(null)
  }

  // ----- Job card (closure over outer state) -----
  function renderCard(job: CalJob, compact = false) {
    const pColor = PRIORITY_COLOR[job.priority] ?? '#5ba3f5'
    const tColor = job.techId ? (techColor[job.techId] ?? '#5ba3f5') : 'var(--text4)'
    const isDragging = dragging === job.id

    return (
      <div
        key={job.id}
        draggable={can(session.role, 'editJob')}
        onDragStart={e => {
          e.dataTransfer.setData('jobId', job.id)
          e.dataTransfer.effectAllowed = 'move'
          setDragging(job.id)
        }}
        onDragEnd={() => { setDragging(null); setDropHover(null) }}
        onClick={() => setOpenJobId(job.id)}
        className="cal-card"
        style={{
          position: 'relative',
          background: `${pColor}12`,
          border: `1px solid ${pColor}28`,
          borderLeft: `3px solid ${pColor}`,
          borderRadius: 6,
          padding: compact ? '3px 6px 3px 5px' : '8px 10px',
          cursor: can(session.role, 'editJob') ? 'grab' : 'pointer',
          opacity: isDragging ? 0.3 : 1,
          marginBottom: compact ? 2 : 0,
          userSelect: 'none',
          minWidth: 0,
          transition: 'opacity .15s, transform .1s, box-shadow .15s',
        }}
      >
        {job.scheduledAt && can(session.role, 'editJob') && (
          <button
            onClick={e => { e.stopPropagation(); patchSchedule(job.id, null) }}
            className="cal-unschedule-btn"
            style={{
              position: 'absolute',
              top: 3,
              right: 4,
              fontSize: 11,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text4)',
              lineHeight: 1,
              padding: '1px 3px',
              borderRadius: 3,
              transition: 'color .12s, background .12s',
            }}
            title="Unschedule"
          >
            ×
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            fontSize: compact ? 9 : 11,
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
          }}>
            {job.client}
          </div>
          {job.tech && (
            <div style={{
              width: compact ? 14 : 18,
              height: compact ? 14 : 18,
              borderRadius: '50%',
              background: tColor,
              color: '#080c1a',
              fontSize: compact ? 6 : 7,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontFamily: 'var(--font-mono)',
            }}>
              {job.tech.initials}
            </div>
          )}
        </div>
        {!compact && (
          <div style={{
            fontSize: 10,
            color: 'var(--text4)',
            marginTop: 2,
            fontFamily: 'var(--font-body)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {job.type}
          </div>
        )}
      </div>
    )
  }

  // ----- Overlays -----
  const overlays = (
    <>
      {openJobId && (
        <JobDrawer
          jobId={openJobId}
          users={users}
          session={session}
          onClose={() => setOpenJobId(null)}
          onJobUpdate={updated => {
            setJobs(prev => prev.map(j =>
              j.id === updated.id ? { ...j, status: updated.status, tech: updated.tech } : j
            ))
          }}
          onOpenPayment={(jobId, client) => {
            setOpenJobId(null)
            setPayJob({ id: jobId, client })
          }}
        />
      )}
      {payJob && (
        <PaymentOverlay
          jobId={payJob.id}
          clientName={payJob.client}
          onClose={() => setPayJob(null)}
          onSuccess={() => setPayJob(null)}
        />
      )}
    </>
  )

  // ===== MOBILE VIEW =====
  if (isMobile) {
    const selectedDay = weekDays[mobileDay]
    const dayJobs = thisWeek.filter(j => isSameDay(new Date(j.scheduledAt!), selectedDay))

    function mobileCard(job: CalJob) {
      const pColor = PRIORITY_COLOR[job.priority] ?? '#5ba3f5'
      const tColor = job.techId ? (techColor[job.techId] ?? '#5ba3f5') : 'var(--text4)'
      return (
        <div
          key={job.id}
          onClick={() => setOpenJobId(job.id)}
          className="mobile-job-card"
          style={{
            background: 'var(--bg3)',
            border: `1px solid var(--border)`,
            borderLeft: `3px solid ${pColor}`,
            borderRadius: 10,
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'border-color .15s, background .15s, transform .1s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              color: 'var(--text)',
              lineHeight: 1.3,
              flex: 1,
            }}>
              {job.client}
            </div>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              color: pColor,
              background: `${pColor}18`,
              padding: '2px 8px',
              borderRadius: 20,
              border: `1px solid ${pColor}30`,
              flexShrink: 0,
            }}>
              {job.priority}
            </span>
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--text4)',
            fontFamily: 'var(--font-body)',
            marginBottom: job.tech ? 8 : 0,
          }}>
            {job.type} · {job.address.split(',')[0]}
          </div>
          {job.tech && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: tColor,
                color: '#080c1a',
                fontSize: 7,
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {job.tech.initials}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, fontFamily: 'var(--font-body)' }}>
                {job.tech.name}
              </span>
            </div>
          )}
          {job.scheduledAt && can(session.role, 'editJob') && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={e => { e.stopPropagation(); patchSchedule(job.id, null) }}
                className="unschedule-btn"
                style={{
                  padding: '4px 10px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 10,
                  color: 'var(--text4)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  transition: 'border-color .12s, color .12s',
                }}
              >
                Unschedule
              </button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Mobile header */}
        <div style={{
          padding: '12px 14px 8px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg2)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              fontSize: 17,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              letterSpacing: '.02em',
              color: 'var(--text)',
              flex: 1,
              textTransform: 'uppercase',
            }}>
              {t('dispatchSchedule')}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => { setWStart(getWeekStart(new Date())); setMobileDay(new Date().getDay()) }}
                className="today-btn"
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--amber-border, rgba(245,158,11,.35))',
                  background: 'rgba(245,158,11,.08)',
                  color: 'var(--amber)',
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                  transition: 'background .15s',
                }}
              >
                Today
              </button>
              <button
                onClick={() => setWStart(d => addDays(d, -7))}
                className="nav-arrow-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '5px 8px',
                  borderRadius: '6px 0 0 6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg3)',
                  color: 'var(--text3)',
                  cursor: 'pointer',
                  transition: 'background .12s, color .12s',
                }}
              >
                <ChevronLeft />
              </button>
              <button
                onClick={() => setWStart(d => addDays(d, 7))}
                className="nav-arrow-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '5px 8px',
                  borderRadius: '0 6px 6px 0',
                  border: '1px solid var(--border)',
                  borderLeft: 'none',
                  background: 'var(--bg3)',
                  color: 'var(--text3)',
                  cursor: 'pointer',
                  transition: 'background .12s, color .12s',
                }}
              >
                <ChevronRight />
              </button>
            </div>
          </div>

          {/* Day selector strip */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 6 }}>
            {weekDays.map((d, i) => {
              const isToday = isSameDay(d, today)
              const isSelected = i === mobileDay
              const jobCount = thisWeek.filter(j => isSameDay(new Date(j.scheduledAt!), d)).length
              return (
                <button
                  key={i}
                  onClick={() => setMobileDay(i)}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderRadius: 10,
                    border: `1px solid ${isSelected ? 'var(--amber)' : 'var(--border)'}`,
                    background: isSelected ? 'rgba(245,158,11,.12)' : 'transparent',
                    cursor: 'pointer',
                    minWidth: 44,
                    transition: 'border-color .15s, background .15s',
                  }}
                >
                  <div style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    color: isToday ? 'var(--amber)' : 'var(--text4)',
                    marginBottom: 2,
                  }}>
                    {dayLabels[d.getDay()]}
                  </div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: isSelected || isToday ? 'var(--amber)' : 'var(--text)',
                    lineHeight: 1,
                  }}>
                    {d.getDate()}
                  </div>
                  <div style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: jobCount > 0 ? 'var(--amber)' : 'transparent',
                    marginTop: 3,
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {jobCount > 0 ? `${jobCount}` : '·'}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Tech filter */}
          {techs.length > 1 && (
            <div style={{ marginTop: 6 }}>
              <select
                value={filterTechId}
                onChange={e => setFilterTechId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 12,
                  fontFamily: 'var(--font-body)',
                  padding: '7px 10px',
                  outline: 'none',
                }}
              >
                <option value="all">{t('allTechs')}</option>
                {techs.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Day content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Scheduled for this day */}
          <div style={{ padding: '10px 12px' }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              letterSpacing: '.06em',
              color: 'var(--text4)',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · {dayJobs.length} {dayJobs.length === 1 ? 'job' : 'jobs'}
            </div>
            {dayJobs.length === 0 ? (
              <div style={{
                padding: '24px 0',
                textAlign: 'center',
                color: 'var(--text4)',
                fontSize: 12,
                fontFamily: 'var(--font-body)',
              }}>
                Nothing scheduled
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {HOURS.map(hour => {
                  const hJobs = dayJobs.filter(j => new Date(j.scheduledAt!).getHours() === hour)
                  if (hJobs.length === 0) return null
                  return (
                    <div key={hour} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{
                        fontSize: 10,
                        color: 'var(--text4)',
                        fontWeight: 600,
                        fontFamily: 'var(--font-mono)',
                        width: 42,
                        paddingTop: 14,
                        textAlign: 'right',
                        flexShrink: 0,
                        letterSpacing: '-.01em',
                      }}>
                        {fmtHour(hour)}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {hJobs.map(j => mobileCard(j))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Unscheduled section */}
          {unscheduled.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px' }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                letterSpacing: '.06em',
                color: 'var(--text4)',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}>
                {t('unscheduledJobs')} ({unscheduled.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {unscheduled.map(j => mobileCard(j))}
              </div>
            </div>
          )}
        </div>

        {overlays}

        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          .mobile-job-card:hover {
            background: var(--bg4) !important;
            transform: translateY(-1px);
          }
          .unschedule-btn:hover {
            border-color: var(--border2) !important;
            color: var(--text3) !important;
          }
          .today-btn:hover {
            background: rgba(245,158,11,.16) !important;
          }
          .nav-arrow-btn:hover {
            background: var(--bg4) !important;
            color: var(--text) !important;
          }
        `}</style>
      </div>
    )
  }

  // ===== DESKTOP VIEW =====
  const weekEnd = addDays(wStart, 6)
  const rangeLabel = wStart.getMonth() === weekEnd.getMonth()
    ? wStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : `${wStart.toLocaleDateString('en-US', { month: 'short' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
        background: 'var(--bg2)',
        flexWrap: 'wrap',
      }}>
        {/* Title + range */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            letterSpacing: '.02em',
            color: 'var(--text)',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}>
            {t('dispatchSchedule')}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--text4)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '-.01em',
          }}>
            {rangeLabel}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
          {/* Tech color legend */}
          {techs.length > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginRight: 4 }}>
              {techs.slice(0, 5).map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: techColor[u.id] ?? '#5ba3f5',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 10,
                    color: 'var(--text4)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                  }}>
                    {u.name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tech filter */}
          <select
            value={filterTechId}
            onChange={e => setFilterTechId(e.target.value)}
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 7,
              color: 'var(--text)',
              fontSize: 11,
              fontFamily: 'var(--font-body)',
              padding: '6px 10px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">{t('allTechs')}</option>
            {techs.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          {/* Today button */}
          <button
            onClick={() => setWStart(getWeekStart(new Date()))}
            className="cal-today-btn"
            style={{
              padding: '6px 13px',
              borderRadius: 7,
              border: '1px solid var(--amber-border, rgba(245,158,11,.35))',
              background: 'rgba(245,158,11,.08)',
              color: 'var(--amber)',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              transition: 'background .15s',
              letterSpacing: '.01em',
            }}
          >
            Today
          </button>

          {/* Week navigation */}
          <div style={{ display: 'flex', gap: 0 }}>
            <button
              onClick={() => setWStart(d => addDays(d, -7))}
              className="cal-nav-btn cal-nav-btn--left"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 10px',
                borderRadius: '7px 0 0 7px',
                border: '1px solid var(--border)',
                background: 'var(--bg3)',
                color: 'var(--text3)',
                cursor: 'pointer',
                lineHeight: 1,
                transition: 'background .12s, color .12s, border-color .12s',
              }}
            >
              <ChevronLeft />
            </button>
            <button
              onClick={() => setWStart(d => addDays(d, 7))}
              className="cal-nav-btn cal-nav-btn--right"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 10px',
                borderRadius: '0 7px 7px 0',
                border: '1px solid var(--border)',
                borderLeft: 'none',
                background: 'var(--bg3)',
                color: 'var(--text3)',
                cursor: 'pointer',
                lineHeight: 1,
                transition: 'background .12s, color .12s, border-color .12s',
              }}
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Unscheduled sidebar */}
        <div style={{
          width: 216,
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          background: 'var(--bg2)',
        }}>
          <div style={{
            padding: '10px 12px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              letterSpacing: '.07em',
              textTransform: 'uppercase',
              color: 'var(--text3)',
            }}>
              {t('unscheduledJobs')}
            </span>
            {unscheduled.length > 0 && (
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: 'var(--amber)',
                background: 'rgba(245,158,11,.12)',
                border: '1px solid rgba(245,158,11,.25)',
                padding: '1px 6px',
                borderRadius: 10,
                lineHeight: 1.4,
              }}>
                {unscheduled.length}
              </span>
            )}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
            onDrop={e => {
              e.preventDefault()
              const jobId = e.dataTransfer.getData('jobId')
              if (jobId && can(session.role, 'editJob')) {
                patchSchedule(jobId, null)
                setDragging(null)
              }
            }}
          >
            {unscheduled.length === 0 ? (
              <div style={{
                fontSize: 11,
                color: 'var(--text4)',
                fontFamily: 'var(--font-body)',
                textAlign: 'center',
                padding: '24px 8px',
                lineHeight: 1.6,
              }}>
                {t('noUnscheduledJobs')}
              </div>
            ) : (
              unscheduled.map(j => renderCard(j))
            )}
          </div>

          {can(session.role, 'editJob') && (
            <div style={{
              padding: '8px 12px',
              borderTop: '1px solid var(--border)',
              fontSize: 9,
              color: 'var(--text4)',
              fontFamily: 'var(--font-body)',
              lineHeight: 1.5,
              letterSpacing: '.01em',
            }}>
              {t('dragToSlot')}
            </div>
          )}
        </div>

        {/* Calendar grid */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            minWidth: 560,
          }}>
            <colgroup>
              <col style={{ width: 56 }} />
              {weekDays.map((_, i) => <col key={i} />)}
            </colgroup>

            {/* Day headers */}
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg2)' }}>
                {/* time column header */}
                <th style={{
                  padding: '10px 6px',
                  fontSize: 9,
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text4)',
                  fontWeight: 700,
                  borderBottom: '2px solid var(--border2)',
                  borderRight: '1px solid var(--border)',
                  textAlign: 'center',
                }}>
                  Time
                </th>

                {weekDays.map((d, i) => {
                  const isToday = isSameDay(d, today)
                  return (
                    <th
                      key={i}
                      style={{
                        padding: '10px 6px',
                        textAlign: 'center',
                        borderBottom: '2px solid var(--border2)',
                        borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                        background: isToday ? 'rgba(245,158,11,.06)' : 'transparent',
                      }}
                    >
                      <div style={{
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                        color: isToday ? 'var(--amber)' : 'var(--text4)',
                        marginBottom: 4,
                      }}>
                        {dayLabels[d.getDay()]}
                      </div>
                      <div style={{
                        fontSize: 18,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: isToday ? 'var(--amber)' : 'var(--text)',
                        lineHeight: 1,
                      }}>
                        {d.getDate()}
                      </div>
                      {isToday && (
                        <div style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: 'var(--amber)',
                          margin: '4px auto 0',
                        }} />
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Time slot rows */}
            <tbody>
              {HOURS.map(hour => (
                <tr key={hour}>
                  {/* Hour label */}
                  <td style={{
                    padding: '0 8px 0 4px',
                    fontSize: 9,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '-.01em',
                    color: 'var(--text4)',
                    fontWeight: 500,
                    textAlign: 'right',
                    verticalAlign: 'top',
                    paddingTop: 6,
                    borderBottom: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                    width: 56,
                  }}>
                    {fmtHour(hour)}
                  </td>

                  {/* Day cells */}
                  {weekDays.map((day, dayIdx) => {
                    const cellKey = `${dayIdx}-${hour}`
                    const isHover = dropHover === cellKey
                    const isToday = isSameDay(day, today)
                    const cellJobs = slotJobs(dayIdx, hour)
                    return (
                      <td
                        key={dayIdx}
                        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropHover(cellKey) }}
                        onDragLeave={e => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setDropHover(k => k === cellKey ? null : k)
                          }
                        }}
                        onDrop={e => handleDrop(e, dayIdx, hour)}
                        style={{
                          padding: '3px',
                          verticalAlign: 'top',
                          height: 54,
                          borderBottom: '1px solid var(--border)',
                          borderRight: dayIdx < 6 ? '1px solid var(--border)' : 'none',
                          background: isHover
                            ? 'rgba(245,158,11,.1)'
                            : isToday
                              ? 'rgba(245,158,11,.025)'
                              : 'transparent',
                          transition: 'background .12s',
                          position: 'relative',
                        }}
                      >
                        {isHover && cellJobs.length === 0 && (
                          <div style={{
                            position: 'absolute',
                            inset: 3,
                            border: '2px dashed rgba(245,158,11,.45)',
                            borderRadius: 5,
                            pointerEvents: 'none',
                          }} />
                        )}
                        {cellJobs.map(j => renderCard(j, true))}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {overlays}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Calendar card hover */
        .cal-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,.25);
          transform: translateY(-1px);
          z-index: 1;
        }
        .cal-card:active {
          transform: translateY(0);
          box-shadow: none;
        }

        /* Unschedule × button */
        .cal-unschedule-btn:hover {
          color: var(--text2) !important;
          background: rgba(255,255,255,.07) !important;
        }

        /* Today button */
        .cal-today-btn:hover {
          background: rgba(245,158,11,.16) !important;
        }

        /* Nav arrow buttons */
        .cal-nav-btn:hover {
          background: var(--bg4) !important;
          color: var(--text) !important;
          border-color: var(--border2) !important;
          z-index: 1;
          position: relative;
        }
        .cal-nav-btn--left:hover {
          border-right-color: var(--border) !important;
        }

        /* Sidebar drag target highlight */
        .sidebar-drop-zone:hover {
          background: var(--bg3);
        }

        /* Scrollbar styling */
        .cal-grid-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .cal-grid-scroll::-webkit-scrollbar-track {
          background: var(--bg);
        }
        .cal-grid-scroll::-webkit-scrollbar-thumb {
          background: var(--border2);
          border-radius: 3px;
        }
      `}</style>
    </div>
  )
}
