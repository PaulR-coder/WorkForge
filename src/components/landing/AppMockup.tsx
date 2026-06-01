'use client'

import { useState } from 'react'

type Tab = 'jobs' | 'invoices' | 'field'
type Status = 'open' | 'scheduled' | 'in_progress' | 'done'

interface Job {
  id: string
  client: string
  type: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: Status
  tech: string | null
  techInitials: string | null
  address: string
  time: string | null
}

const JOBS: Job[] = [
  { id: '1', client: 'Sunrise HVAC',   type: 'AC Installation',        priority: 'high',   status: 'open',        tech: 'Carlos M.',  techInitials: 'CM', address: '123 Tampa St, Tampa FL',      time: null        },
  { id: '2', client: 'Metro Plumbing', type: 'Pipe Repair',            priority: 'normal', status: 'open',        tech: null,         techInitials: null, address: '456 Bayshore Dr, Tampa FL',   time: null        },
  { id: '3', client: 'Bay Electric',   type: 'Panel Upgrade',          priority: 'urgent', status: 'open',        tech: 'James R.',   techInitials: 'JR', address: '789 Dale Mabry, Tampa FL',    time: null        },
  { id: '4', client: 'Gulf Coast AC',  type: 'Preventive Maintenance', priority: 'normal', status: 'scheduled',   tech: 'Carlos M.',  techInitials: 'CM', address: '321 Fletcher Ave, Tampa FL',  time: '9:00 AM'   },
  { id: '5', client: 'Harbor Homes',   type: 'Water Heater Install',   priority: 'normal', status: 'scheduled',   tech: 'Diana L.',   techInitials: 'DL', address: '654 Hillsborough, Tampa FL',  time: '11:30 AM'  },
  { id: '6', client: 'Clearwater Inc.', type: 'HVAC Inspection',       priority: 'high',   status: 'in_progress', tech: 'James R.',   techInitials: 'JR', address: '987 Kennedy Blvd, Tampa FL',  time: '8:00 AM'   },
  { id: '7', client: 'Palm Realty',    type: 'Drain Cleaning',         priority: 'normal', status: 'in_progress', tech: 'Diana L.',   techInitials: 'DL', address: '147 Fowler Ave, Tampa FL',    time: '10:00 AM'  },
  { id: '8', client: 'Bayside Office', type: 'Thermostat Install',     priority: 'normal', status: 'done',        tech: 'Carlos M.',  techInitials: 'CM', address: '258 Busch Blvd, Tampa FL',    time: '7:00 AM'   },
  { id: '9', client: 'Westshore LLC',  type: 'AC Service Call',        priority: 'low',    status: 'done',        tech: 'James R.',   techInitials: 'JR', address: '369 Armenia Ave, Tampa FL',   time: '9:00 AM'   },
]

const COLS: { id: Status; label: string; color: string }[] = [
  { id: 'open',        label: 'Open',        color: '#5ba3f5' },
  { id: 'scheduled',   label: 'Scheduled',   color: '#f59e0b' },
  { id: 'in_progress', label: 'In Progress', color: '#a78bfa' },
  { id: 'done',        label: 'Done',        color: '#22c55e' },
]

const PRI: Record<string, string> = { low: '#94a3b8', normal: '#5ba3f5', high: '#f59e0b', urgent: '#ef4444' }
const PRI_LABEL: Record<string, string> = { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' }

const INVOICES = [
  { id: 'INV-0041', client: 'Sunrise HVAC',    amount: 2400, status: 'paid',    date: 'May 28' },
  { id: 'INV-0042', client: 'Gulf Coast AC',   amount: 890,  status: 'sent',    date: 'May 30' },
  { id: 'INV-0043', client: 'Bay Electric',    amount: 3200, status: 'overdue', date: 'May 15' },
  { id: 'INV-0044', client: 'Metro Plumbing',  amount: 650,  status: 'draft',   date: 'Jun 1'  },
  { id: 'INV-0045', client: 'Harbor Homes',    amount: 1100, status: 'paid',    date: 'May 25' },
]

const INV_COLOR: Record<string, string> = { draft: '#7a8fa6', sent: '#5ba3f5', paid: '#22c55e', overdue: '#ef4444' }

const FIELD_JOBS = [
  { client: 'Gulf Coast AC',   type: 'Preventive Maintenance', address: '321 Fletcher Ave, Tampa', time: '9:00 AM',  status: 'in_progress', note: 'Check all 3 rooftop units. Client requested extra filter check.' },
  { client: 'Harbor Homes',    type: 'Water Heater Install',   address: '654 Hillsborough, Tampa',  time: '11:30 AM', status: 'scheduled',   note: '50-gal Rheem. Access through garage side door.' },
  { client: 'Clearwater Inc.', type: 'HVAC Inspection',        address: '987 Kennedy Blvd, Tampa',  time: '2:00 PM',  status: 'scheduled',   note: 'Annual inspection. Building manager: Mike, 813-555-0192.' },
]

export default function AppMockup() {
  const [tab, setTab] = useState<Tab>('jobs')
  const [selected, setSelected] = useState<string | null>('6')
  const [jobs, setJobs] = useState<Job[]>(JOBS)
  const [fieldJob, setFieldJob] = useState<number | null>(0)

  const selectedJob = jobs.find(j => j.id === selected) ?? null

  function moveJob(id: string, newStatus: Status) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: newStatus } : j))
    setSelected(id)
  }

  return (
    <div style={{
      border: '1px solid rgba(255,255,255,.09)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 32px 80px rgba(0,0,0,.65)',
      fontFamily: 'var(--font-body, system-ui)',
    }}>
      {/* Browser chrome */}
      <div style={{ background: '#0a0f1e', borderBottom: '1px solid rgba(255,255,255,.07)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#ef4444','#f59e0b','#22c55e'].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: .55 }} />
          ))}
        </div>
        {/* Tabs */}
        <div style={{ flex: 1, display: 'flex', gap: 2, justifyContent: 'center' }}>
          {([
            { id: 'jobs',     label: 'Jobs Board' },
            { id: 'invoices', label: 'Invoices'   },
            { id: 'field',    label: 'Field View'  },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? 'rgba(245,158,11,.13)' : 'transparent',
                border: tab === t.id ? '1px solid rgba(245,158,11,.28)' : '1px solid transparent',
                borderRadius: 6,
                color: tab === t.id ? '#f59e0b' : '#566882',
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ width: 120, background: 'rgba(255,255,255,.05)', borderRadius: 5, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: '#566882', fontFamily: 'monospace' }}>getworkforge.com</span>
        </div>
      </div>

      {/* ── JOBS BOARD ── */}
      {tab === 'jobs' && (
        <div style={{ background: '#080d1c', display: 'flex', height: 420 }}>
          {/* Sidebar */}
          <div style={{ width: 52, background: '#050810', borderRight: '1px solid rgba(255,255,255,.07)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 4, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, background: '#f59e0b', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <svg viewBox="-44 -44 88 88" style={{ width: 14, height: 14 }}><path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="#050810" /></svg>
            </div>
            {[
              { label: 'Dashboard', active: false },
              { label: 'Jobs',      active: true  },
              { label: 'Invoices',  active: false },
              { label: 'Schedule',  active: false },
              { label: 'Team',      active: false },
            ].map(({ label, active }) => (
              <div key={label} title={label} style={{
                width: 34, height: 34, borderRadius: 8,
                background: active ? 'rgba(245,158,11,.15)' : 'transparent',
                border: active ? '1px solid rgba(245,158,11,.25)' : '1px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: active ? '#f59e0b' : 'rgba(255,255,255,.15)' }} />
              </div>
            ))}
          </div>

          {/* Kanban */}
          <div style={{ flex: 1, padding: '16px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#f0f4ff', letterSpacing: '-0.3px' }}>Jobs Board</span>
                <span style={{ fontSize: 11, color: '#566882', marginLeft: 10 }}>9 jobs · 3 urgent</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ height: 26, paddingInline: 10, background: '#111827', borderRadius: 6, border: '1px solid rgba(255,255,255,.09)', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#7a8fa6' }}>All techs ▾</span>
                </div>
                <div style={{ height: 26, paddingInline: 10, background: '#f59e0b', borderRadius: 6, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#050810' }}>+ New Job</span>
                </div>
              </div>
            </div>

            {/* Board */}
            <div style={{ display: 'flex', gap: 10, flex: 1, overflow: 'hidden' }}>
              {/* Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, flex: selectedJob ? '0 0 60%' : 1, transition: 'flex .25s', overflow: 'hidden' }}>
                {COLS.map(col => {
                  const colJobs = jobs.filter(j => j.status === col.id)
                  return (
                    <div key={col.id} style={{ background: 'rgba(255,255,255,.025)', borderRadius: 9, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ padding: '8px 10px 7px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: col.color }} />
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#a8b8cc', textTransform: 'uppercase', letterSpacing: '.07em' }}>{col.label}</span>
                        <span style={{ fontSize: 9, color: '#566882', marginLeft: 'auto', fontWeight: 700 }}>{colJobs.length}</span>
                      </div>
                      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
                        {colJobs.map(job => (
                          <div
                            key={job.id}
                            onClick={() => setSelected(selected === job.id ? null : job.id)}
                            style={{
                              background: selected === job.id ? '#0d1a30' : '#0d1526',
                              borderRadius: 7,
                              padding: '8px 9px',
                              marginBottom: 5,
                              borderLeft: `2px solid ${PRI[job.priority]}`,
                              cursor: 'pointer',
                              outline: selected === job.id ? `1px solid rgba(245,158,11,.35)` : '1px solid transparent',
                              transition: 'outline .12s, background .12s',
                            }}
                          >
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#f0f4ff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.client}</div>
                            <div style={{ fontSize: 9, color: '#566882', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.type}</div>
                            {job.techInitials && (
                              <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: '#050810', flexShrink: 0 }}>
                                  {job.techInitials}
                                </div>
                                <span style={{ fontSize: 9, color: '#7a8fa6' }}>{job.tech?.split(' ')[0]}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Detail panel */}
              {selectedJob && (
                <div style={{
                  flex: 1,
                  background: '#0a0f20',
                  border: '1px solid rgba(255,255,255,.08)',
                  borderRadius: 10,
                  padding: '14px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  animation: 'slideIn .18s ease',
                }}>
                  <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:none; } }`}</style>

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#f0f4ff', marginBottom: 2 }}>{selectedJob.client}</div>
                      <div style={{ fontSize: 11, color: '#7a8fa6' }}>{selectedJob.type}</div>
                    </div>
                    <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#566882', cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 5, background: `${PRI[selectedJob.priority]}18`, color: PRI[selectedJob.priority], textTransform: 'uppercase', letterSpacing: '.05em' }}>
                      {PRI_LABEL[selectedJob.priority]}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 5, background: `${COLS.find(c=>c.id===selectedJob.status)?.color}18`, color: COLS.find(c=>c.id===selectedJob.status)?.color, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                      {COLS.find(c=>c.id===selectedJob.status)?.label}
                    </span>
                  </div>

                  <div style={{ background: '#111827', borderRadius: 7, padding: '9px 10px', fontSize: 10, color: '#7a8fa6', lineHeight: 1.6 }}>
                    <div style={{ marginBottom: 4 }}>📍 {selectedJob.address}</div>
                    {selectedJob.time && <div>🕐 {selectedJob.time}</div>}
                    {!selectedJob.time && <div style={{ color: '#566882' }}>🕐 Not yet scheduled</div>}
                  </div>

                  <div style={{ background: '#111827', borderRadius: 7, padding: '9px 10px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#566882', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Technician</div>
                    {selectedJob.techInitials ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#050810' }}>
                          {selectedJob.techInitials}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#a8b8cc' }}>{selectedJob.tech}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>⚠ Unassigned</span>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#566882', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Move to</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {COLS.filter(c => c.id !== selectedJob.status).map(c => (
                        <button
                          key={c.id}
                          onClick={() => moveJob(selectedJob.id, c.id)}
                          style={{
                            fontSize: 9, fontWeight: 700, padding: '4px 8px', borderRadius: 5,
                            background: `${c.color}15`, color: c.color,
                            border: `1px solid ${c.color}30`,
                            cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'background .12s',
                          }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── INVOICES ── */}
      {tab === 'invoices' && (
        <div style={{ background: '#080d1c', height: 420, display: 'flex' }}>
          <div style={{ width: 52, background: '#050810', borderRight: '1px solid rgba(255,255,255,.07)', flexShrink: 0 }} />
          <div style={{ flex: 1, padding: '16px 18px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#f0f4ff' }}>Invoices</span>
                <span style={{ fontSize: 11, color: '#566882', marginLeft: 10 }}>
                  ${INVOICES.filter(i => i.status === 'paid').reduce((s,i) => s+i.amount, 0).toLocaleString()} collected
                </span>
              </div>
              <div style={{ height: 26, paddingInline: 10, background: '#f59e0b', borderRadius: 6, display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#050810' }}>+ New Invoice</span>
              </div>
            </div>

            <div style={{ background: '#0a0f20', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 70px 60px', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                {['Client', 'Amount', 'Status', 'Date'].map(h => (
                  <span key={h} style={{ fontSize: 9, fontWeight: 700, color: '#566882', textTransform: 'uppercase', letterSpacing: '.07em' }}>{h}</span>
                ))}
              </div>
              {INVOICES.map((inv, i) => (
                <div key={inv.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 70px 60px',
                  padding: '11px 14px', borderBottom: i < INVOICES.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none',
                  cursor: 'pointer', transition: 'background .12s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4ff' }}>{inv.client}</div>
                    <div style={{ fontSize: 10, color: '#566882', fontFamily: 'monospace' }}>{inv.id}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: INV_COLOR[inv.status], alignSelf: 'center' }}>${inv.amount.toLocaleString()}</div>
                  <div style={{ alignSelf: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 5, background: `${INV_COLOR[inv.status]}18`, color: INV_COLOR[inv.status], textTransform: 'uppercase', letterSpacing: '.05em' }}>
                      {inv.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#566882', alignSelf: 'center' }}>{inv.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FIELD VIEW ── */}
      {tab === 'field' && (
        <div style={{ background: '#080d1c', height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 24 }}>
          {/* Phone frame */}
          <div style={{ width: 200, background: '#050810', border: '2px solid rgba(255,255,255,.12)', borderRadius: 24, padding: '10px 0', overflow: 'hidden', flexShrink: 0, boxShadow: '0 16px 48px rgba(0,0,0,.5)' }}>
            <div style={{ width: 60, height: 5, background: 'rgba(255,255,255,.15)', borderRadius: 3, margin: '0 auto 12px' }} />
            <div style={{ padding: '0 10px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#f0f4ff', marginBottom: 2 }}>My Jobs</div>
              <div style={{ fontSize: 10, color: '#566882', marginBottom: 12 }}>Today · Carlos M.</div>
              {FIELD_JOBS.map((job, i) => (
                <div
                  key={i}
                  onClick={() => setFieldJob(fieldJob === i ? null : i)}
                  style={{
                    background: fieldJob === i ? '#0d1a30' : '#0d1526',
                    borderRadius: 10, padding: '10px 10px', marginBottom: 8, cursor: 'pointer',
                    borderLeft: `3px solid ${job.status === 'in_progress' ? '#a78bfa' : '#5ba3f5'}`,
                    outline: fieldJob === i ? '1px solid rgba(245,158,11,.3)' : '1px solid transparent',
                    transition: 'all .12s',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: job.status === 'in_progress' ? '#a78bfa' : '#f59e0b', marginBottom: 3 }}>
                    {job.time} {job.status === 'in_progress' && '· In Progress'}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f0f4ff', marginBottom: 2 }}>{job.client}</div>
                  <div style={{ fontSize: 10, color: '#566882' }}>{job.type}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Job detail on phone tap */}
          <div style={{ flex: 1, maxWidth: 300 }}>
            {fieldJob !== null ? (
              <div style={{ background: '#0a0f20', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '16px', animation: 'slideIn .18s ease' }}>
                <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:none; } }`}</style>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>{FIELD_JOBS[fieldJob].time}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#f0f4ff', marginBottom: 3 }}>{FIELD_JOBS[fieldJob].client}</div>
                <div style={{ fontSize: 12, color: '#7a8fa6', marginBottom: 12 }}>{FIELD_JOBS[fieldJob].type}</div>
                <div style={{ background: '#111827', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: '#566882', marginBottom: 4 }}>📍 Address</div>
                  <div style={{ fontSize: 12, color: '#a8b8cc' }}>{FIELD_JOBS[fieldJob].address}</div>
                </div>
                <div style={{ background: '#111827', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: '#566882', marginBottom: 4 }}>📋 Notes</div>
                  <div style={{ fontSize: 11, color: '#a8b8cc', lineHeight: 1.6 }}>{FIELD_JOBS[fieldJob].note}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, height: 32, background: '#f59e0b', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#050810' }}>Mark Done</span>
                  </div>
                  <div style={{ height: 32, paddingInline: 12, background: '#111827', border: '1px solid rgba(255,255,255,.09)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, color: '#7a8fa6' }}>Invoice</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#566882' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>👆</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Tap a job to see details</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Address, notes, and quick actions</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
