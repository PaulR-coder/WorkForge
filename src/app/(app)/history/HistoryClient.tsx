'use client'

import { useState } from 'react'
import type { SessionUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { useLang } from '@/components/LangProvider'
import { useIsMobile } from '@/lib/useIsMobile'
import { useToast } from '@/components/Toast'

type HistoryJob = {
  id: string
  client: string
  address: string
  type: string
  priority: string
  status: string
  completedAt: string | null
  archivedAt: string | null
  deletedAt: string | null
  createdAt: string
  tech: { id: string; name: string; initials: string } | null
  invoices: { total: number; status: string }[]
}

const PRIORITY_COLOR: Record<string, string> = {
  low: 'var(--text4)', normal: '#5ba3f5', high: 'var(--amber)', urgent: 'var(--red)',
}

function exportCSV(jobs: HistoryJob[]) {
  const header = ['Client', 'Type', 'Address', 'Tech', 'Priority', 'Completed', 'Archived', 'Deleted', 'Invoice Total']
  const rows = jobs.map(j => [
    j.client,
    j.type,
    j.address,
    j.tech?.name ?? 'Unassigned',
    j.priority,
    j.completedAt ? new Date(j.completedAt).toLocaleDateString() : '',
    j.archivedAt ? new Date(j.archivedAt).toLocaleDateString() : '',
    j.deletedAt ? new Date(j.deletedAt).toLocaleDateString() : '',
    j.invoices.reduce((s, i) => s + i.total, 0).toFixed(2),
  ])
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `job-history-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function HistoryClient({ initialJobs, session }: { initialJobs: HistoryJob[]; session: SessionUser }) {
  const [jobs, setJobs] = useState<HistoryJob[]>(initialJobs)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'archived' | 'deleted'>('all')
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [undeletingId, setUndeletingId] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const { t } = useLang()
  const isMobile = useIsMobile()
  const { toast } = useToast()

  async function fetchFiltered(from: string, to: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to)   params.set('to', to)
      const res  = await fetch(`/api/jobs/history?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setJobs(data)
    } catch {
      toast('Failed to load history', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase()
    const matchesSearch = !q || j.client.toLowerCase().includes(q) || j.type.toLowerCase().includes(q) || (j.tech?.name.toLowerCase().includes(q) ?? false)
    let matchesFilter = true
    if (filter === 'archived') matchesFilter = !!j.archivedAt && !j.deletedAt
    else if (filter === 'deleted') matchesFilter = !!j.deletedAt
    else if (filter === 'active') matchesFilter = !j.archivedAt && !j.deletedAt
    return matchesSearch && matchesFilter
  })

  const totalRevenue = filtered.reduce((s, j) => s + j.invoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.total, 0), 0)
  const thisMonth = filtered.filter(j => j.completedAt && new Date(j.completedAt).getMonth() === new Date().getMonth() && new Date(j.completedAt).getFullYear() === new Date().getFullYear()).length

  async function restoreJob(id: string) {
    setRestoringId(id)
    const res = await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore' }),
    })
    if (res.ok) {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, archivedAt: null } : j))
      toast('Job restored to board', 'success')
    } else {
      toast('Failed to restore job', 'error')
    }
    setRestoringId(null)
  }

  async function undeleteJob(id: string) {
    setUndeletingId(id)
    const res = await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'undelete' }),
    })
    if (res.ok) {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, deletedAt: null } : j))
      toast('Job restored to board', 'success')
    } else {
      toast('Failed to restore job', 'error')
    }
    setUndeletingId(null)
  }

  const kpiBoxes: { label: string; value: string | number; show?: boolean }[] = [
    { label: 'Total Jobs', value: filtered.length },
    { label: 'This Month', value: thisMonth },
    { label: 'Archived', value: filtered.filter(j => j.archivedAt && !j.deletedAt).length },
    { label: 'Deleted', value: jobs.filter(j => j.deletedAt).length, show: !isMobile },
    { label: 'Paid Revenue', value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, show: !isMobile },
  ]

  return (
    <div style={{ padding: isMobile ? 12 : 24, maxWidth: 1000, margin: '0 auto' }}>
      <style>{`
        /* KPI boxes: 2x2 grid on mobile */
        @media (max-width: 639px) {
          .wf-mobile-kpi-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            flex-wrap: unset !important;
          }
          .wf-mobile-kpi-grid > div {
            flex: unset !important;
            min-width: unset !important;
          }
        }
        /* Filter pills: allow horizontal scroll on mobile */
        @media (max-width: 639px) {
          .wf-mobile-filter-row {
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 4px;
          }
          .wf-mobile-filter-row button {
            flex-shrink: 0;
            white-space: nowrap;
            min-height: 44px;
          }
        }
        /* Data table: horizontal scroll wrapper */
        @media (max-width: 639px) {
          .wf-mobile-table-scroll {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
          }
          .wf-mobile-table-scroll > div {
            min-width: 600px;
          }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: '.5px', marginBottom: 3 }}>
            {t('jobHistory')}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text4)' }}>All completed, archived, and deleted work orders</div>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 9, color: 'var(--text3)', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', transition: 'border-color .15s', minHeight: 44,
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.18)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {t('exportCsv')}
        </button>
      </div>

      {/* KPI Boxes */}
      <div className="wf-mobile-kpi-grid" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {kpiBoxes.filter(b => b.show !== false).map(b => (
          <div key={b.label} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '14px 20px', flex: 1, minWidth: isMobile ? '40%' : 120,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>
              {b.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: '.5px' }}>
              {b.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="wf-mobile-filter-row" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Search input with icon */}
        <div style={{ flex: 1, minWidth: 200, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 11, color: 'var(--text4)', pointerEvents: 'none', flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchHistory')}
            style={{
              width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 9, color: 'var(--text)', fontSize: 13, padding: '9px 12px 9px 34px',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Filter pills */}
        {(['all', 'active', 'archived', 'deleted'] as const).map(f => {
          const isActive = filter === f
          const isDeleted = f === 'deleted'
          return (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '9px 16px', borderRadius: 20, fontFamily: 'inherit',
                border: `1px solid ${isActive ? (isDeleted ? 'var(--red)' : 'var(--amber)') : 'var(--border)'}`,
                background: isActive ? (isDeleted ? 'rgba(239,68,68,.12)' : 'rgba(245,158,11,.12)') : 'var(--bg2)',
                color: isActive ? (isDeleted ? 'var(--red)' : 'var(--amber)') : 'var(--text3)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
              {f === 'all' ? 'All' : f === 'active' ? 'On Board' : f === 'archived' ? 'Archived' : t('deleted')}
            </button>
          )
        })}
      </div>

      {/* Date Range Filter */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)' }}>From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); fetchFiltered(e.target.value, dateTo) }}
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '6px 10px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
          }}
        />
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)' }}>To</label>
        <input
          type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); fetchFiltered(dateFrom, e.target.value) }}
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '6px 10px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
          }}
        />
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => { setDateFrom(''); setDateTo(''); fetchFiltered('', '') }}
            style={{ fontSize: 11, color: 'var(--amber)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            Clear
          </button>
        )}
        {loading && <span style={{ fontSize: 11, color: 'var(--text4)' }}>Loading…</span>}
      </div>

      {/* Table */}
      <div className={isMobile ? 'wf-mobile-table-scroll' : undefined}>
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '72px 0', color: 'var(--text4)' }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ display: 'block', margin: '0 auto 16px', color: 'var(--text4)' }}>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          </svg>
          <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text3)', fontSize: 14 }}>
            {search ? 'No results found' : t('noHistory')}
          </div>
          {search && <div style={{ fontSize: 12 }}>Try a different search term</div>}
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Sticky header row */}
          {!isMobile && (
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
              padding: '10px 16px', borderBottom: '1px solid var(--border)',
              background: 'var(--bg3)', position: 'sticky', top: 0,
            }}>
              {['Client', 'Type', 'Tech', 'Completed', 'Revenue', ''].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px' }}>{h}</div>
              ))}
            </div>
          )}

          {filtered.map((job, i) => {
            const jobRevenue = job.invoices.filter(inv => inv.status === 'paid').reduce((s, inv) => s + inv.total, 0)
            const completedDate = job.completedAt ? new Date(job.completedAt).toLocaleDateString() : '—'

            return (
              <div key={job.id} style={{
                display: isMobile ? 'flex' : 'grid',
                gridTemplateColumns: isMobile ? undefined : '2fr 1fr 1fr 1fr 1fr auto',
                flexDirection: isMobile ? 'column' : undefined,
                gap: isMobile ? 4 : 0,
                padding: '12px 16px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background .12s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Client */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: job.deletedAt ? 'var(--text4)' : 'var(--text)', textDecoration: job.deletedAt ? 'line-through' : 'none' }}>{job.client}</span>
                    {job.deletedAt && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(239,68,68,.12)', color: 'var(--red)', border: '1px solid rgba(239,68,68,.25)' }}>
                        {t('deleted')}
                      </span>
                    )}
                    {job.archivedAt && !job.deletedAt && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'var(--bg4)', color: 'var(--text4)', border: '1px solid var(--border)' }}>
                        {t('archived')}
                      </span>
                    )}
                    <span style={{ fontSize: 9, fontWeight: 700, color: PRIORITY_COLOR[job.priority], background: `${PRIORITY_COLOR[job.priority]}18`, padding: '2px 7px', borderRadius: 20 }}>
                      {job.priority}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? '100%' : 260 }}>
                    {job.address}
                  </div>
                </div>

                {/* Type */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', background: 'var(--bg3)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                    {job.type}
                  </span>
                </div>

                {/* Tech */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {job.tech ? (
                    <>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--amber)', color: '#080c1a', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, letterSpacing: '.3px' }}>
                        {job.tech.initials}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{isMobile ? job.tech.initials : job.tech.name.split(' ')[0]}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text4)' }}>—</span>
                  )}
                </div>

                {/* Completed */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{completedDate}</span>
                </div>

                {/* Revenue */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: jobRevenue > 0 ? 'var(--green)' : 'var(--text4)', fontFamily: jobRevenue > 0 ? 'var(--font-mono)' : 'inherit' }}>
                    {jobRevenue > 0 ? `$${jobRevenue.toLocaleString()}` : '—'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  {can(session.role, 'archiveJob') && job.archivedAt && !job.deletedAt && (
                    <button
                      onClick={() => restoreJob(job.id)}
                      disabled={restoringId === job.id}
                      style={{
                        padding: '5px 10px', background: 'transparent', border: '1px solid var(--border)',
                        borderRadius: 7, color: 'var(--text3)', fontSize: 11, fontWeight: 700,
                        cursor: restoringId === job.id ? 'wait' : 'pointer',
                        opacity: restoringId === job.id ? 0.5 : 1, whiteSpace: 'nowrap',
                        fontFamily: 'inherit', minHeight: 44,
                      }}>
                      {restoringId === job.id ? '…' : t('restore')}
                    </button>
                  )}
                  {can(session.role, 'deleteJob') && job.deletedAt && (
                    <button
                      onClick={() => undeleteJob(job.id)}
                      disabled={undeletingId === job.id}
                      style={{
                        padding: '5px 10px', background: 'transparent',
                        border: '1px solid rgba(239,68,68,.35)',
                        borderRadius: 7, color: 'var(--red)', fontSize: 11, fontWeight: 700,
                        cursor: undeletingId === job.id ? 'wait' : 'pointer',
                        opacity: undeletingId === job.id ? 0.5 : 1, whiteSpace: 'nowrap',
                        fontFamily: 'inherit', minHeight: 44,
                      }}>
                      {undeletingId === job.id ? '…' : t('restoreDeleted')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>{/* end wf-mobile-table-scroll */}

      <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text4)', textAlign: 'center' }}>
        Showing {filtered.length} of {jobs.length} jobs
      </div>
    </div>
  )
}
