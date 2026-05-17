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
        ...(scheduledAt ? { status: 'scheduled' } : {}),
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
        style={{
          background: `${pColor}12`,
          border: `1px solid ${pColor}30`,
          borderLeft: `3px solid ${pColor}`,
          borderRadius: 5,
          padding: compact ? '3px 5px' : '8px 10px',
          cursor: can(session.role, 'editJob') ? 'grab' : 'pointer',
          opacity: isDragging ? 0.35 : 1,
          marginBottom: compact ? 2 : 0,
          userSelect: 'none',
          minWidth: 0,
          transition: 'opacity .1s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            fontSize: compact ? 9 : 11,
            fontWeight: 700,
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
            }}>
              {job.tech.initials}
            </div>
          )}
        </div>
        {!compact && (
          <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>
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
          style={{
            background: 'var(--bg2)',
            border: `1px solid var(--border)`,
            borderLeft: `3px solid ${pColor}`,
            borderRadius: 10,
            padding: '12px 14px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, flex: 1 }}>{job.client}</div>
            <span style={{ fontSize: 9, fontWeight: 700, color: pColor, background: `${pColor}18`, padding: '2px 8px', borderRadius: 20, border: `1px solid ${pColor}30`, flexShrink: 0 }}>
              {job.priority}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: job.tech ? 8 : 0 }}>{job.type} · {job.address.split(',')[0]}</div>
          {job.tech && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: tColor, color: '#080c1a', fontSize: 7, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {job.tech.initials}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>{job.tech.name}</span>
            </div>
          )}
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Mobile header */}
        <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', flex: 1 }}>
              📅 {t('dispatchSchedule')}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => { setWStart(getWeekStart(new Date())); setMobileDay(new Date().getDay()) }}
                style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid var(--amber)', background: 'transparent', color: 'var(--amber)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
              >
                Today
              </button>
              <button onClick={() => setWStart(d => addDays(d, -7))}
                style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>‹</button>
              <button onClick={() => setWStart(d => addDays(d, 7))}
                style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>›</button>
            </div>
          </div>

          {/* Day selector strip */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 6 }}>
            {weekDays.map((d, i) => {
              const isToday = isSameDay(d, today)
              const isSelected = i === mobileDay
              const jobCount = thisWeek.filter(j => isSameDay(new Date(j.scheduledAt!), d)).length
              return (
                <button key={i}
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
                  }}
                >
                  <div style={{ fontSize: 9, fontWeight: 700, color: isToday ? 'var(--amber)' : 'var(--text4)', marginBottom: 2 }}>
                    {dayLabels[d.getDay()]}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: isSelected ? 'var(--amber)' : isToday ? 'var(--amber)' : 'var(--text)', lineHeight: 1 }}>
                    {d.getDate()}
                  </div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: jobCount > 0 ? 'var(--amber)' : 'transparent', marginTop: 2 }}>
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
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '7px 10px', outline: 'none' }}
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
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
              {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · {dayJobs.length} {dayJobs.length === 1 ? 'job' : 'jobs'}
            </div>
            {dayJobs.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text4)', fontSize: 12 }}>
                Nothing scheduled
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {HOURS.map(hour => {
                  const hJobs = dayJobs.filter(j => new Date(j.scheduledAt!).getHours() === hour)
                  if (hJobs.length === 0) return null
                  return (
                    <div key={hour} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 600, width: 40, paddingTop: 14, textAlign: 'right', flexShrink: 0 }}>
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
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
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

      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        background: 'var(--bg2)',
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
            📅 {t('dispatchSchedule')}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>{rangeLabel}</div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
          {/* Tech color legend */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginRight: 8 }}>
            {techs.slice(0, 5).map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: techColor[u.id] ?? '#5ba3f5' }} />
                <span style={{ fontSize: 10, color: 'var(--text4)' }}>{u.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>

          <select
            value={filterTechId}
            onChange={e => setFilterTechId(e.target.value)}
            style={{
              background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 7,
              color: 'var(--text)', fontSize: 11, padding: '6px 10px', outline: 'none',
            }}
          >
            <option value="all">{t('allTechs')}</option>
            {techs.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          <button
            onClick={() => setWStart(getWeekStart(new Date()))}
            style={{
              padding: '6px 12px', borderRadius: 7, border: '1px solid var(--amber)',
              background: 'transparent', color: 'var(--amber)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Today
          </button>

          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => setWStart(d => addDays(d, -7))}
              style={{ padding: '6px 11px', borderRadius: '7px 0 0 7px', border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text3)', fontSize: 14, cursor: 'pointer', lineHeight: 1 }}>
              ‹
            </button>
            <button onClick={() => setWStart(d => addDays(d, 7))}
              style={{ padding: '6px 11px', borderRadius: '0 7px 7px 0', border: '1px solid var(--border)', borderLeft: 'none', background: 'var(--bg3)', color: 'var(--text3)', fontSize: 14, cursor: 'pointer', lineHeight: 1 }}>
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Unscheduled sidebar */}
        <div style={{
          width: 210,
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          background: 'var(--bg2)',
        }}>
          <div style={{
            padding: '10px 12px',
            borderBottom: '1px solid var(--border)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '.5px',
          }}>
            {t('unscheduledJobs')} ({unscheduled.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {unscheduled.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text4)', textAlign: 'center', padding: '20px 8px', lineHeight: 1.5 }}>
                {t('noUnscheduledJobs')}
              </div>
            ) : (
              unscheduled.map(j => renderCard(j))
            )}
          </div>
          {can(session.role, 'editJob') && (
            <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', fontSize: 9, color: 'var(--text4)', lineHeight: 1.4 }}>
              {t('dragToSlot')}
            </div>
          )}
        </div>

        {/* Calendar grid */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 560 }}>
            <colgroup>
              <col style={{ width: 52 }} />
              {weekDays.map((_, i) => <col key={i} />)}
            </colgroup>
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg2)' }}>
                <th style={{
                  padding: '8px 4px',
                  fontSize: 9,
                  color: 'var(--text4)',
                  fontWeight: 600,
                  borderBottom: '2px solid var(--border)',
                  borderRight: '1px solid var(--border)',
                  textAlign: 'center',
                }}>
                  Time
                </th>
                {weekDays.map((d, i) => {
                  const isToday = isSameDay(d, today)
                  return (
                    <th key={i} style={{
                      padding: '8px 6px',
                      textAlign: 'center',
                      borderBottom: '2px solid var(--border)',
                      borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                      background: isToday ? 'rgba(245,158,11,.05)' : 'transparent',
                    }}>
                      <div style={{ fontSize: 9, color: isToday ? 'var(--amber)' : 'var(--text4)', fontWeight: 700, marginBottom: 2 }}>
                        {dayLabels[d.getDay()]}
                      </div>
                      <div style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: isToday ? 'var(--amber)' : 'var(--text)',
                        lineHeight: 1,
                      }}>
                        {d.getDate()}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(hour => (
                <tr key={hour}>
                  <td style={{
                    padding: '4px 6px 4px 4px',
                    fontSize: 9,
                    color: 'var(--text4)',
                    fontWeight: 600,
                    textAlign: 'right',
                    verticalAlign: 'top',
                    borderBottom: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                    paddingTop: 6,
                  }}>
                    {fmtHour(hour)}
                  </td>
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
                          height: 52,
                          borderBottom: '1px solid var(--border)',
                          borderRight: dayIdx < 6 ? '1px solid var(--border)' : 'none',
                          background: isHover
                            ? 'rgba(245,158,11,.12)'
                            : isToday
                              ? 'rgba(245,158,11,.025)'
                              : 'transparent',
                          transition: 'background .1s',
                          position: 'relative',
                        }}
                      >
                        {isHover && cellJobs.length === 0 && (
                          <div style={{
                            position: 'absolute',
                            inset: 3,
                            border: '2px dashed rgba(245,158,11,.5)',
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
      `}</style>
    </div>
  )
}
