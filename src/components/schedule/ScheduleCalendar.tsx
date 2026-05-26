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

type TeamMember = { id: string; name: string; initials: string; role: string; specialty: string }

// 7 AM – 8 PM (inclusive)
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)

const PRIORITY_COLOR: Record<string, string> = {
  low: '#6b7280',
  normal: '#5ba3f5',
  high: '#f59e0b',
  urgent: '#ef4444',
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  scheduled: 'Scheduled',
  done: 'Done',
  cancelled: 'Cancelled',
}

const STATUS_BG: Record<string, string> = {
  open: 'var(--bg3)',
  in_progress: 'rgba(91,163,245,0.15)',
  scheduled: 'rgba(91,163,245,0.10)',
  done: 'rgba(34,197,94,0.15)',
  cancelled: 'var(--bg3)',
}

const STATUS_COLOR: Record<string, string> = {
  open: 'var(--text3)',
  in_progress: '#5ba3f5',
  scheduled: '#5ba3f5',
  done: '#22c55e',
  cancelled: 'var(--text4)',
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
  teamMembers = [],
}: {
  session: SessionUser
  users: CalUser[]
  teamMembers?: TeamMember[]
}) {
  const [jobs, setJobs] = useState<CalJob[]>([])
  const [wStart, setWStart] = useState<Date>(() => getWeekStart(new Date()))
  const [openJobId, setOpenJobId] = useState<string | null>(null)
  const [payJob, setPayJob] = useState<{ id: string; client: string } | null>(null)
  const [filterTechId, setFilterTechId] = useState('all')
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropHover, setDropHover] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date())
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

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Day selector strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
          background: 'var(--bg2)', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <button
            onClick={() => setSelectedDay(prev => addDays(prev, -1))}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 16 }}
          >‹</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            {!isSameDay(selectedDay, today) && (
              <button
                onClick={() => setSelectedDay(today)}
                style={{ fontSize: 11, color: 'var(--amber)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, marginTop: 2 }}
              >
                Today
              </button>
            )}
          </div>
          <button
            onClick={() => setSelectedDay(prev => addDays(prev, 1))}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 16 }}
          >›</button>
        </div>

        {/* Scrollable job list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {(() => {
            const dayJobs = baseJobs
              .filter(j => j.scheduledAt && isSameDay(new Date(j.scheduledAt!), selectedDay))
              .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
            return (
              <>
                {dayJobs.length === 0 && (
                  <div style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
                    padding: '24px', textAlign: 'center', marginBottom: 16,
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>Nothing scheduled</div>
                    <div style={{ fontSize: 12, color: 'var(--text4)' }}>No jobs scheduled for this day</div>
                  </div>
                )}
                {dayJobs.map(job => (
                  <div
                    key={job.id}
                    onClick={() => setOpenJobId(job.id)}
                    style={{
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                      borderLeft: `3px solid ${PRIORITY_COLOR[job.priority] ?? 'var(--border)'}`,
                      borderRadius: 12, padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--text4)', fontWeight: 600, marginBottom: 2 }}>
                        {new Date(job.scheduledAt!).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{job.client}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{job.type}</div>
                      <div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px',
                          borderRadius: 99, background: STATUS_BG[job.status] ?? 'var(--bg3)',
                          color: STATUS_COLOR[job.status] ?? 'var(--text3)',
                          textTransform: 'uppercase', letterSpacing: 0.5,
                          display: 'inline-block',
                        }}>
                          {STATUS_LABEL[job.status] ?? job.status}
                        </span>
                      </div>
                    </div>
                    {job.tech && (
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: job.techId ? (techColor[job.techId] ?? TECH_PALETTE[0]) : TECH_PALETTE[0],
                        color: '#060a17',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, flexShrink: 0,
                      }}>
                        {job.tech.initials}
                      </div>
                    )}
                  </div>
                ))}

                {unscheduled.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 800, color: 'var(--text4)',
                      textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      Unscheduled
                      <span style={{
                        background: 'var(--amber)', color: '#080c1a',
                        borderRadius: 99, fontSize: 10, fontWeight: 800,
                        padding: '1px 7px',
                      }}>{unscheduled.length}</span>
                    </div>
                    {unscheduled.map(job => (
                      <div
                        key={job.id}
                        onClick={() => setOpenJobId(job.id)}
                        style={{
                          background: 'var(--bg2)', border: '1px solid var(--border)',
                          borderLeft: `3px solid ${PRIORITY_COLOR[job.priority] ?? 'var(--border)'}`,
                          borderRadius: 12, padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{job.client}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{job.type}</div>
                        <div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px',
                            borderRadius: 99, background: STATUS_BG[job.status] ?? 'var(--bg3)',
                            color: STATUS_COLOR[job.status] ?? 'var(--text3)',
                            textTransform: 'uppercase', letterSpacing: 0.5,
                            display: 'inline-block',
                          }}>
                            {STATUS_LABEL[job.status] ?? job.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          })()}
        </div>

        {overlays}

        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
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

        {/* Team strip */}
        {teamMembers.length > 0 && (
          <div style={{ width: 180, borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '12px 0', flexShrink: 0 }}>
            <div style={{ padding: '0 12px 8px', fontSize: 9, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '1.1px' }}>Team</div>
            <button
              type="button"
              onClick={() => setFilterTechId('all')}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                background: filterTechId === 'all' ? 'var(--bg3)' : 'transparent',
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: filterTechId === 'all' ? 'var(--amber)' : 'var(--text3)',
              }}
            >
              Everyone
            </button>
            {teamMembers.map(u => (
              <button
                type="button"
                key={u.id}
                onClick={() => setFilterTechId(filterTechId === u.id ? 'all' : u.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  background: filterTechId === u.id ? 'var(--bg3)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: filterTechId === u.id ? 'var(--amber)' : 'var(--bg4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800,
                  color: filterTechId === u.id ? '#060a17' : 'var(--text3)',
                  flexShrink: 0,
                }}>
                  {u.initials}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: filterTechId === u.id ? 'var(--amber)' : 'var(--text3)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        )}

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
