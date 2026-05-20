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
  createdAt: string
  tech: { id: string; name: string; initials: string } | null
  invoices: { total: number; status: string }[]
}

const PRIORITY_COLOR: Record<string, string> = {
  low: 'var(--text4)', normal: '#5ba3f5', high: 'var(--amber)', urgent: 'var(--red)',
}

function exportCSV(jobs: HistoryJob[]) {
  const header = ['Client', 'Type', 'Address', 'Tech', 'Priority', 'Completed', 'Archived', 'Invoice Total']
  const rows = jobs.map(j => [
    j.client,
    j.type,
    j.address,
    j.tech?.name ?? 'Unassigned',
    j.priority,
    j.completedAt ? new Date(j.completedAt).toLocaleDateString() : '',
    j.archivedAt ? new Date(j.archivedAt).toLocaleDateString() : '',
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
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all')
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const { t } = useLang()
  const isMobile = useIsMobile()
  const { toast } = useToast()

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase()
    const matchesSearch = !q || j.client.toLowerCase().includes(q) || j.type.toLowerCase().includes(q) || (j.tech?.name.toLowerCase().includes(q) ?? false)
    const matchesFilter = filter === 'all' || (filter === 'archived' ? !!j.archivedAt : !j.archivedAt)
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

  const statBox = (label: string, value: string | number) => (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', flex: 1, minWidth: isMobile ? '40%' : 120 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{value}</div>
    </div>
  )

  return (
    <div style={{ padding: isMobile ? 12 : 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{t('jobHistory')}</h1>
          <div style={{ fontSize: 12, color: 'var(--text4)' }}>All completed and archived work orders</div>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          style={{ marginLeft: 'auto', padding: '8px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text3)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {t('exportCsv')}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {statBox('Total Jobs', filtered.length)}
        {statBox('This Month', thisMonth)}
        {statBox('Archived', filtered.filter(j => j.archivedAt).length)}
        {!isMobile && statBox('Paid Revenue', `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`)}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('searchHistory')}
          style={{ flex: 1, minWidth: 200, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, padding: '9px 12px', outline: 'none', fontFamily: 'inherit' }}
        />
        {(['all', 'active', 'archived'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '9px 14px', borderRadius: 8, border: `1px solid ${filter === f ? 'var(--amber)' : 'var(--border)'}`, background: filter === f ? 'rgba(245,158,11,.1)' : 'var(--bg2)', color: filter === f ? 'var(--amber)' : 'var(--text3)', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' }}>
            {f === 'all' ? 'All' : f === 'active' ? 'On Board' : 'Archived'}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text4)', fontSize: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text3)' }}>{search ? 'No results found' : t('noHistory')}</div>
          {search && <div style={{ fontSize: 12 }}>Try a different search term</div>}
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 0, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
              {['Client', 'Type', 'Tech', 'Completed', 'Revenue', ''].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</div>
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
                transition: 'background .1s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Client + address */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{job.client}</span>
                    {job.archivedAt && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: 'var(--bg4)', color: 'var(--text4)', border: '1px solid var(--border)' }}>
                        {t('archived')}
                      </span>
                    )}
                    <span style={{ fontSize: 9, fontWeight: 700, color: PRIORITY_COLOR[job.priority], background: `${PRIORITY_COLOR[job.priority]}18`, padding: '2px 6px', borderRadius: 10 }}>
                      {job.priority}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? '100%' : 260 }}>
                    {job.address}
                  </div>
                </div>

                {/* Type */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{job.type}</span>
                </div>

                {/* Tech */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {job.tech ? (
                    <>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--amber)', color: '#080c1a', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{completedDate}</span>
                </div>

                {/* Revenue */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: jobRevenue > 0 ? 'var(--green)' : 'var(--text4)' }}>
                    {jobRevenue > 0 ? `$${jobRevenue.toLocaleString()}` : '—'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  {can(session.role, 'archiveJob') && job.archivedAt && (
                    <button
                      onClick={() => restoreJob(job.id)}
                      disabled={restoringId === job.id}
                      style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text3)', fontSize: 11, fontWeight: 700, cursor: restoringId === job.id ? 'wait' : 'pointer', opacity: restoringId === job.id ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                      {restoringId === job.id ? '…' : t('restore')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text4)', textAlign: 'center' }}>
        Showing {filtered.length} of {jobs.length} jobs
      </div>
    </div>
  )
}
