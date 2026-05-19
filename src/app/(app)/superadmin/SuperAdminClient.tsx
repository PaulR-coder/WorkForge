'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/lib/useIsMobile'

type TenantRow = {
  id: string; name: string; slug: string; active: boolean; createdAt: string
  subscriptionStatus: string; trialEndsAt: string | null; currentPeriodEnd: string | null
  stripeCustomerId: string | null; userCount: number; jobsThisMonth: number
  lastActivity: string
}

type PlatformStats = {
  totalTenants: number; mrr: number; totalUsers: number
  totalJobsThisMonth: number; activeCount: number; trialCount: number; totalJobs: number
}

type TenantDetail = TenantRow & {
  users: { id: string; name: string; email: string; initials: string; role: string; active: boolean; createdAt: string }[]
  totalJobs: number
}

const STATUS_CFG: Record<string, { label: string; dot: string; color: string; bg: string; border: string }> = {
  active:    { label: 'Active',    dot: '●', color: 'var(--green)',  bg: 'rgba(34,197,94,.12)',   border: 'rgba(34,197,94,.25)'   },
  trialing:  { label: 'Trial',     dot: '◐', color: '#5ba3f5',       bg: 'rgba(91,163,245,.12)',  border: 'rgba(91,163,245,.25)'  },
  past_due:  { label: 'Past Due',  dot: '⚠', color: 'var(--amber)',  bg: 'rgba(245,158,11,.12)',  border: 'rgba(245,158,11,.25)'  },
  cancelled: { label: 'Cancelled', dot: '○', color: 'var(--text4)',  bg: 'var(--bg3)',             border: 'var(--border)'         },
  unpaid:    { label: 'Unpaid',    dot: '⚠', color: 'var(--red)',    bg: 'rgba(239,68,68,.12)',    border: 'rgba(239,68,68,.25)'   },
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 2) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function joinedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

type Alert = { type: 'error' | 'warn' | 'info'; tenantId: string; tenantName: string; msg: string }

function buildAlerts(tenants: TenantRow[]): Alert[] {
  const alerts: Alert[] = []
  for (const t of tenants) {
    if (t.subscriptionStatus === 'past_due' || t.subscriptionStatus === 'unpaid') {
      alerts.push({ type: 'error', tenantId: t.id, tenantName: t.name, msg: 'Payment failed' })
    }
    if (t.subscriptionStatus === 'trialing' && t.trialEndsAt) {
      const daysLeft = Math.ceil((new Date(t.trialEndsAt).getTime() - Date.now()) / 86400000)
      if (daysLeft <= 7 && daysLeft >= 0) {
        alerts.push({ type: 'warn', tenantId: t.id, tenantName: t.name, msg: `Trial ends in ${daysLeft}d` })
      }
    }
    const daysSinceActive = Math.floor((Date.now() - new Date(t.lastActivity).getTime()) / 86400000)
    if (daysSinceActive > 14 && t.subscriptionStatus !== 'cancelled') {
      alerts.push({ type: 'info', tenantId: t.id, tenantName: t.name, msg: `Inactive ${daysSinceActive}d` })
    }
  }
  return alerts
}

const ALERT_COLOR: Record<string, string> = { error: 'var(--red)', warn: 'var(--amber)', info: 'var(--text4)' }
const ALERT_ICON: Record<string, string> = { error: '⚠', warn: '⏱', info: '💤' }

export default function SuperAdminClient({ tenants, stats }: { tenants: TenantRow[]; stats: PlatformStats }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [mainTab, setMainTab] = useState<'dashboard' | 'tenants'>('dashboard')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'activity' | 'users' | 'jobs'>('newest')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<TenantDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [impersonating, setImpersonating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createAdminName, setCreateAdminName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createResult, setCreateResult] = useState<{ password: string } | null>(null)

  const TABS = ['all', 'active', 'trialing', 'past_due', 'cancelled']

  const filtered = useMemo(() => {
    let list = tenants
    if (filter !== 'all') list = list.filter(t => t.subscriptionStatus === filter)
    if (search.trim()) list = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    return [...list].sort((a, b) => {
      if (sort === 'activity') return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      if (sort === 'users')    return b.userCount - a.userCount
      if (sort === 'jobs')     return b.jobsThisMonth - a.jobsThisMonth
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [tenants, filter, search, sort])

  async function openDetail(id: string) {
    setSelectedId(id)
    setDetail(null)
    setDetailLoading(true)
    const res = await fetch(`/api/superadmin/tenant/${id}`)
    if (res.ok) setDetail(await res.json())
    setDetailLoading(false)
  }

  function closeDetail() {
    setSelectedId(null)
    setDetail(null)
  }

  async function runAction(action: string) {
    if (!selectedId) return
    setActionLoading(action)
    const res = await fetch(`/api/superadmin/tenant/${selectedId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) router.refresh()
    setActionLoading(null)
  }

  async function startImpersonate() {
    if (!selectedId) return
    setImpersonating(true)
    const res = await fetch('/api/superadmin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: selectedId }),
    })
    if (res.ok) { router.push('/dashboard'); router.refresh() }
    else setImpersonating(false)
  }

  async function submitCreate() {
    if (!createName.trim() || !createEmail.trim() || !createAdminName.trim()) return
    setCreateLoading(true)
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName: createName.trim(), name: createAdminName.trim(), email: createEmail.trim(), password: '__SA__', superadminCreate: true }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { setCreateResult({ password: data.tempPassword ?? '(check logs)' }); router.refresh() }
    setCreateLoading(false)
  }

  const tenant = selectedId ? tenants.find(t => t.id === selectedId) : null

  // ─── Platform dashboard derived stats ────────────────────────────────────
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const newThisMonth = tenants.filter(t => new Date(t.createdAt) >= monthStart).length
  const alerts = useMemo(() => buildAlerts(tenants), [tenants])

  const trialsAtRisk = tenants.filter(t => {
    if (t.subscriptionStatus !== 'trialing' || !t.trialEndsAt) return false
    const days = Math.ceil((new Date(t.trialEndsAt).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 7
  })

  const needsAttention = useMemo(() => {
    const seen = new Set<string>()
    const items: { tenantId: string; tenantName: string; reason: string; urgency: 'high' | 'medium' | 'low' }[] = []
    for (const t of tenants) {
      if (t.subscriptionStatus === 'cancelled') continue
      if (t.subscriptionStatus === 'past_due' || t.subscriptionStatus === 'unpaid') {
        if (!seen.has(t.id)) { seen.add(t.id); items.push({ tenantId: t.id, tenantName: t.name, reason: 'Payment failed — account at risk', urgency: 'high' }) }
      }
      if (t.subscriptionStatus === 'trialing' && t.trialEndsAt) {
        const days = Math.ceil((new Date(t.trialEndsAt).getTime() - Date.now()) / 86400000)
        if (days >= 0 && days <= 7 && !seen.has(t.id)) {
          seen.add(t.id); items.push({ tenantId: t.id, tenantName: t.name, reason: `Trial ends in ${days}d — needs conversion`, urgency: 'high' })
        }
      }
      if (t.jobsThisMonth === 0 && t.userCount <= 1 && !seen.has(t.id)) {
        seen.add(t.id); items.push({ tenantId: t.id, tenantName: t.name, reason: 'No jobs created, no team invited — likely lost', urgency: 'medium' })
      }
      const inactive = Math.floor((Date.now() - new Date(t.lastActivity).getTime()) / 86400000)
      if (inactive > 10 && !seen.has(t.id)) {
        seen.add(t.id); items.push({ tenantId: t.id, tenantName: t.name, reason: `No activity in ${inactive} days`, urgency: 'low' })
      }
    }
    return items.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.urgency] - { high: 0, medium: 1, low: 2 }[b.urgency])).slice(0, 6)
  }, [tenants])

  const mostEngaged = useMemo(() =>
    [...tenants]
      .filter(t => t.subscriptionStatus !== 'cancelled')
      .sort((a, b) => (b.jobsThisMonth * 3 + b.userCount * 2) - (a.jobsThisMonth * 3 + a.userCount * 2))
      .slice(0, 5)
  , [tenants])

  const conversionRate = (() => {
    const converted = stats.activeCount
    const total = stats.activeCount + tenants.filter(t => t.subscriptionStatus === 'cancelled').length
    return total > 0 ? Math.round((converted / total) * 100) : null
  })()

  const statusBreakdown = [
    { label: 'Active',    count: stats.activeCount,  color: 'var(--green)', bg: 'rgba(34,197,94,.12)' },
    { label: 'Trialing',  count: stats.trialCount,   color: '#5ba3f5',      bg: 'rgba(91,163,245,.12)' },
    { label: 'Past Due',  count: tenants.filter(t => t.subscriptionStatus === 'past_due').length,  color: 'var(--amber)', bg: 'rgba(245,158,11,.12)' },
    { label: 'Cancelled', count: tenants.filter(t => t.subscriptionStatus === 'cancelled').length, color: 'var(--text4)', bg: 'var(--bg3)' },
  ]

  const URGENCY_COLOR: Record<string, string> = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--text4)' }
  const URGENCY_ICON: Record<string, string>  = { high: '🔴', medium: '🟡', low: '⚪' }

  const PlatformDashboard = () => (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 16px' : '20px 24px' }}>
      {/* Main KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          {
            value: `$${stats.mrr.toLocaleString()}`,
            label: 'Your MRR',
            sub: `${stats.activeCount} paying account${stats.activeCount !== 1 ? 's' : ''}`,
            color: stats.mrr > 0 ? 'var(--green)' : 'var(--text4)',
          },
          {
            value: String(trialsAtRisk.length),
            label: 'Trials at Risk',
            sub: trialsAtRisk.length > 0 ? 'Expiring within 7 days' : 'No trials expiring soon',
            color: trialsAtRisk.length > 0 ? 'var(--red)' : 'var(--green)',
          },
          {
            value: String(stats.totalTenants),
            label: 'Total Workspaces',
            sub: `${newThisMonth} joined this month`,
            color: 'var(--text)',
          },
          {
            value: String(stats.totalUsers),
            label: 'Total Users',
            sub: stats.totalTenants > 0 ? `${(stats.totalUsers / stats.totalTenants).toFixed(1)} avg per workspace` : 'Across all workspaces',
            color: 'var(--text)',
          },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: k.color, letterSpacing: '-.5px', marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 3 }}>{k.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text4)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Subscription breakdown */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>Subscription Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {statusBreakdown.map(s => {
              const pct = stats.totalTenants > 0 ? Math.round((s.count / stats.totalTenants) * 100) : 0
              return (
                <div key={s.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)' }}>{s.count} <span style={{ color: 'var(--text4)', fontWeight: 400 }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: 3, transition: 'width .4s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Platform metrics */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>Platform Metrics</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { label: 'Jobs created this month',    value: String(stats.totalJobsThisMonth), color: 'var(--text)' },
              { label: 'Total jobs all time',         value: String(stats.totalJobs),          color: 'var(--text)' },
              { label: 'Trial → paid conversion',     value: conversionRate !== null ? `${conversionRate}%` : 'No data yet', color: conversionRate !== null && conversionRate > 50 ? 'var(--green)' : 'var(--amber)' },
              { label: 'Needs attention',             value: String(needsAttention.length),   color: needsAttention.length > 0 ? 'var(--amber)' : 'var(--green)' },
              { label: 'Alerts active',               value: String(alerts.length),            color: alerts.length > 0 ? 'var(--red)' : 'var(--green)' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{r.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: r.color }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        {/* Most engaged accounts */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Most Engaged</div>
          <div style={{ fontSize: 10, color: 'var(--text4)', marginBottom: 14 }}>Ranked by jobs this month + team size</div>
          {mostEngaged.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text4)', textAlign: 'center', padding: '20px 0' }}>No active workspaces yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mostEngaged.map((t, i) => (
                <div key={t.id} onClick={() => { setMainTab('tenants'); openDetail(t.id) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: i === 0 ? 'rgba(245,158,11,.05)' : 'transparent', border: i === 0 ? '1px solid rgba(245,158,11,.15)' : '1px solid transparent' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = i === 0 ? 'rgba(245,158,11,.05)' : 'transparent'}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: i === 0 ? 'rgba(245,158,11,.2)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: i === 0 ? 'var(--amber)' : 'var(--text4)', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)' }}>{t.jobsThisMonth} jobs · {t.userCount} users · {relativeTime(t.lastActivity)}</div>
                  </div>
                  <div style={{ fontSize: 18, color: 'var(--text4)', flexShrink: 0 }}>→</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Needs attention — actionable churn prevention */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>
            Needs Attention {needsAttention.length > 0 && <span style={{ color: 'var(--amber)' }}>· {needsAttention.length}</span>}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text4)', marginBottom: 14 }}>Click to open account and email the admin</div>
          {needsAttention.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--green)', textAlign: 'center', padding: '20px 0' }}>✓ All accounts healthy</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {needsAttention.map((a, i) => (
                <div key={i} onClick={() => { setMainTab('tenants'); openDetail(a.tenantId) }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 8, border: `1px solid var(--border)`, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg4)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg3)'}>
                  <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{URGENCY_ICON[a.urgency]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.tenantName}</div>
                    <div style={{ fontSize: 10, color: URGENCY_COLOR[a.urgency], marginTop: 2 }}>{a.reason}</div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text4)', flexShrink: 0, marginTop: 2 }}>→</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ─── KPI strip ───────────────────────────────────────────────────────────
  const kpis = [
    { value: String(stats.totalTenants), label: 'Tenants' },
    { value: `$${stats.mrr.toLocaleString()}`, label: 'MRR', color: stats.mrr > 0 ? 'var(--green)' : undefined },
    { value: String(stats.activeCount), label: 'Active', color: 'var(--green)' },
    { value: String(stats.trialCount), label: 'Trialing', color: '#5ba3f5' },
    { value: String(stats.totalUsers), label: 'Users' },
    { value: String(stats.totalJobs), label: 'Total Jobs' },
  ]

  // ─── Drawer content (shared mobile + desktop) ─────────────────────────
  const DrawerContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Drawer header */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{tenant?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{tenant?.slug}</div>
          </div>
          <button onClick={closeDetail} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text4)', padding: 4, lineHeight: 1 }}>✕</button>
        </div>
        {tenant && (() => {
          const st = STATUS_CFG[tenant.subscriptionStatus] ?? STATUS_CFG.trialing
          return (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border}`, padding: '3px 10px', borderRadius: 20 }}>{st.dot} {st.label}</span>
              {!tenant.active && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', background: 'var(--bg4)', padding: '3px 9px', borderRadius: 20 }}>SUSPENDED</span>}
              <span style={{ fontSize: 11, color: 'var(--text4)' }}>Joined {joinedDate(tenant.createdAt)}</span>
            </div>
          )
        })()}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {detailLoading && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text4)', fontSize: 13 }}>Loading…</div>
        )}
        {detail && (
          <>
            {/* Stats */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { v: String(detail.userCount), l: 'Total Users' },
                { v: String(detail.jobsThisMonth), l: 'Jobs/mo' },
                { v: detail.subscriptionStatus.charAt(0).toUpperCase() + detail.subscriptionStatus.slice(1), l: 'Status' },
              ].map(k => (
                <div key={k.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{k.v}</div>
                  <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{k.l}</div>
                </div>
              ))}
            </div>

            {/* Role breakdown */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { role: 'admin',      label: 'Admins',      color: 'var(--amber)',  bg: 'rgba(245,158,11,.1)' },
                { role: 'dispatcher', label: 'Dispatchers', color: '#5ba3f5',       bg: 'rgba(91,163,245,.1)' },
                { role: 'tech',       label: 'Techs',       color: 'var(--green)',  bg: 'rgba(34,197,94,.1)'  },
              ].map(r => {
                const count = detail.users.filter(u => u.role === r.role && u.active).length
                return (
                  <div key={r.role} style={{ textAlign: 'center', background: r.bg, borderRadius: 10, padding: '10px 6px' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: r.color }}>{count}</div>
                    <div style={{ fontSize: 10, color: r.color, marginTop: 2, fontWeight: 600 }}>{r.label}</div>
                  </div>
                )
              })}
            </div>

            {/* Subscription */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Subscription</div>
              {detail.subscriptionStatus === 'trialing' && detail.trialEndsAt && (
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>Trial ends {new Date(detail.trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              )}
              {detail.subscriptionStatus === 'active' && detail.currentPeriodEnd && (
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>Renews {new Date(detail.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              )}
              {detail.stripeCustomerId
                ? <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 4, fontFamily: 'monospace' }}>{detail.stripeCustomerId}</div>
                : <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 4 }}>No Stripe account yet</div>
              }
            </div>

            {/* Users */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Users · {detail.users.length}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {detail.users.slice(0, 8).map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: u.role === 'admin' ? 'var(--amber)' : 'var(--bg4)', color: u.role === 'admin' ? '#080c1a' : 'var(--text3)', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: u.active ? 1 : 0.4 }}>
                      {u.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: u.active ? 'var(--text2)' : 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text4)', background: 'var(--bg3)', padding: '2px 7px', borderRadius: 10, textTransform: 'capitalize', flexShrink: 0 }}>{u.role}</span>
                  </div>
                ))}
                {detail.users.length > 8 && <div style={{ fontSize: 11, color: 'var(--text4)', paddingLeft: 40 }}>+{detail.users.length - 8} more</div>}
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>Actions</div>
              {(() => {
                const adminUser = detail.users.find(u => u.role === 'admin' && u.active)
                return adminUser ? (
                  <a href={`mailto:${adminUser.email}?subject=Your WorkForge account&body=Hi ${adminUser.name},`}
                    style={{ width: '100%', display: 'block', padding: '12px 0', background: 'rgba(91,163,245,.1)', border: '1px solid rgba(91,163,245,.25)', color: '#5ba3f5', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
                    ✉️ Email {adminUser.name}
                  </a>
                ) : null
              })()}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => runAction('toggle_active')} disabled={actionLoading !== null}
                  style={{ padding: '11px 0', background: 'var(--bg3)', border: '1px solid var(--border)', color: detail.active ? 'var(--red)' : 'var(--green)', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: actionLoading ? 0.6 : 1 }}>
                  {actionLoading === 'toggle_active' ? '…' : detail.active ? '⏸ Suspend' : '▶ Reactivate'}
                </button>
                <button onClick={() => runAction('extend_trial')} disabled={actionLoading !== null}
                  style={{ padding: '11px 0', background: 'var(--bg3)', border: '1px solid var(--border)', color: '#5ba3f5', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: actionLoading ? 0.6 : 1 }}>
                  {actionLoading === 'extend_trial' ? '…' : '⏱ +14d Trial'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )

  // ─── Tab bar (shared) ─────────────────────────────────────────────────
  const MainTabBar = () => (
    <div style={{ display: 'flex', gap: 4, padding: isMobile ? '8px 16px' : '8px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
      {(['dashboard', 'tenants'] as const).map(t => (
        <button key={t} onClick={() => setMainTab(t)}
          style={{ padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid var(--border)', background: mainTab === t ? 'var(--amber)' : 'var(--bg3)', color: mainTab === t ? '#080c1a' : 'var(--text3)', transition: 'all .15s' }}>
          {t === 'dashboard' ? '📊 Dashboard' : '🏢 Tenants'}
        </button>
      ))}
    </div>
  )

  // ─── MOBILE LAYOUT ────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        {/* Mobile header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>🎛 Command Center</div>
            <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>Platform admin</div>
          </div>
          <button onClick={() => setCreateOpen(true)}
            style={{ marginLeft: 'auto', padding: '8px 14px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
            + New
          </button>
        </div>

        <MainTabBar />

        {mainTab === 'dashboard' && <PlatformDashboard />}

        {mainTab === 'tenants' && <>
        {/* KPI grid 3×2 */}
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {kpis.map(k => (
            <div key={k.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: k.color ?? 'var(--text)', letterSpacing: '-.3px' }}>{k.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setFilter(tab)}
              style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid var(--border)', background: filter === tab ? 'var(--amber)' : 'var(--bg2)', color: filter === tab ? '#080c1a' : 'var(--text3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {tab === 'past_due' ? 'Past Due' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab !== 'all' && <span style={{ marginLeft: 4, opacity: .7 }}>{tenants.filter(t => t.subscriptionStatus === tab).length}</span>}
            </button>
          ))}
        </div>

        {/* Search + Sort */}
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants…"
            style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, padding: '10px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 12, padding: '10px 10px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
            <option value="newest">Newest</option>
            <option value="activity">Active</option>
            <option value="users">Users</option>
            <option value="jobs">Jobs</option>
          </select>
        </div>

        {/* Tenant cards */}
        <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text4)', fontSize: 13 }}>No tenants match this filter</div>
          )}
          {filtered.map(t => {
            const st = STATUS_CFG[t.subscriptionStatus] ?? STATUS_CFG.trialing
            const trialDays = t.trialEndsAt ? Math.ceil((new Date(t.trialEndsAt).getTime() - Date.now()) / 86400000) : null
            return (
              <div key={t.id} onClick={() => openDetail(t.id)}
                style={{ background: 'var(--bg2)', border: `1px solid ${!t.active ? 'var(--border)' : t.subscriptionStatus === 'past_due' ? 'rgba(245,158,11,.3)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', opacity: t.active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)' }}>{t.slug}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border}`, padding: '3px 9px', borderRadius: 20 }}>{st.dot} {st.label}</span>
                    {t.subscriptionStatus === 'trialing' && trialDays !== null && (
                      <span style={{ fontSize: 9, color: trialDays <= 3 ? 'var(--red)' : 'var(--text4)' }}>{trialDays > 0 ? `${trialDays}d left` : 'expired'}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text4)' }}>
                  <span><span style={{ fontWeight: 700, color: 'var(--text3)' }}>{t.userCount}</span> users</span>
                  <span><span style={{ fontWeight: 700, color: 'var(--text3)' }}>{t.jobsThisMonth}</span> jobs/mo</span>
                  <span style={{ marginLeft: 'auto' }}>active {relativeTime(t.lastActivity)}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Mobile full-screen detail drawer */}
        {selectedId && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'var(--bg2)', display: 'flex', flexDirection: 'column', animation: 'slideUp .25s ease' }}>
            <DrawerContent />
          </div>
        )}
        </>}

        {/* Create modal */}
        <CreateModal
          open={createOpen}
          createName={createName} setCreateName={setCreateName}
          createEmail={createEmail} setCreateEmail={setCreateEmail}
          createAdminName={createAdminName} setCreateAdminName={setCreateAdminName}
          createLoading={createLoading}
          createResult={createResult}
          onSubmit={submitCreate}
          onClose={() => { setCreateOpen(false); setCreateResult(null); setCreateName(''); setCreateEmail(''); setCreateAdminName('') }}
        />

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0 }
            to   { transform: translateY(0);    opacity: 1 }
          }
        `}</style>
      </div>
    )
  }

  // ─── DESKTOP LAYOUT ──────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: 'var(--bg2)' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.3px' }}>🎛 Command Center</div>
          <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>WorkForge platform administration</div>
        </div>
        <button onClick={() => setCreateOpen(true)}
          style={{ marginLeft: 'auto', padding: '8px 16px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
          + New Tenant
        </button>
      </div>

      <MainTabBar />

      {mainTab === 'dashboard' && <PlatformDashboard />}

      {mainTab === 'tenants' && <>
      {/* KPI strip */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, flexShrink: 0 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color ?? 'var(--text)', letterSpacing: '-.5px' }}>{k.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Main body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Roster */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Filters */}
          <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, background: 'var(--bg)' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {TABS.map(tab => (
                <button key={tab} onClick={() => setFilter(tab)}
                  style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid var(--border)', background: filter === tab ? 'var(--amber)' : 'var(--bg3)', color: filter === tab ? '#080c1a' : 'var(--text3)', whiteSpace: 'nowrap' }}>
                  {tab === 'past_due' ? 'Past Due' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab !== 'all' && <span style={{ marginLeft: 5, opacity: .7 }}>{tenants.filter(t => t.subscriptionStatus === tab).length}</span>}
                </button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 11, padding: '6px 10px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                <option value="newest">Newest</option>
                <option value="activity">Last Active</option>
                <option value="users">Most Users</option>
                <option value="jobs">Most Jobs</option>
              </select>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants…"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '6px 12px', outline: 'none', fontFamily: 'inherit', width: 180 }} />
            </div>
          </div>

          {/* Table header */}
          <div style={{ padding: '8px 20px', display: 'grid', gridTemplateColumns: '1fr 100px 60px 60px 90px 90px 40px', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {['TENANT', 'STATUS', 'USERS', 'JOBS/MO', 'JOINED', 'ACTIVE', ''].map(h => (
              <div key={h} style={{ fontSize: 9, fontWeight: 700, color: 'var(--text4)', letterSpacing: '.5px' }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text4)', fontSize: 13 }}>No tenants match this filter</div>
            )}
            {filtered.map(t => {
              const st = STATUS_CFG[t.subscriptionStatus] ?? STATUS_CFG.trialing
              const isSelected = selectedId === t.id
              const trialDays = t.trialEndsAt ? Math.ceil((new Date(t.trialEndsAt).getTime() - Date.now()) / 86400000) : null
              return (
                <div key={t.id} onClick={() => openDetail(t.id)}
                  style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: '1fr 100px 60px 60px 90px 90px 40px', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isSelected ? 'rgba(245,158,11,.05)' : 'transparent', borderLeft: isSelected ? '3px solid var(--amber)' : '3px solid transparent' }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg2)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.active ? 'var(--text)' : 'var(--text4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {t.name}
                      {!t.active && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text4)', background: 'var(--bg4)', padding: '1px 6px', borderRadius: 10 }}>SUSPENDED</span>}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{t.slug}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border}`, padding: '3px 8px', borderRadius: 20 }}>{st.dot} {st.label}</span>
                    {t.subscriptionStatus === 'trialing' && trialDays !== null && (
                      <div style={{ fontSize: 9, color: trialDays <= 3 ? 'var(--red)' : 'var(--text4)', marginTop: 3 }}>{trialDays > 0 ? `${trialDays}d left` : 'expired'}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', textAlign: 'center' }}>{t.userCount}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.jobsThisMonth > 0 ? 'var(--text2)' : 'var(--text4)', textAlign: 'center' }}>{t.jobsThisMonth}</div>
                  <div style={{ fontSize: 11, color: 'var(--text4)' }}>{joinedDate(t.createdAt)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text4)' }}>{relativeTime(t.lastActivity)}</div>
                  <div style={{ fontSize: 16, color: 'var(--text4)', textAlign: 'center' }}>→</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ width: 260, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto', background: 'var(--bg2)' }}>
          {alerts.length > 0 && (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Alerts · {alerts.length}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map((a, i) => (
                  <div key={i} onClick={() => openDetail(a.tenantId)}
                    style={{ padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: ALERT_COLOR[a.type] }}>{ALERT_ICON[a.type]}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.tenantName}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 3, paddingLeft: 18 }}>{a.msg}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Recent Signups</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tenants.slice(0, 6).map(t => (
                <div key={t.id} onClick={() => openDetail(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--text3)', flexShrink: 0 }}>
                    {t.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--text4)' }}>{relativeTime(t.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop drawer */}
      {selectedId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 800, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)' }} onClick={closeDetail} />
          <div style={{ width: 400, background: 'var(--bg2)', borderLeft: '1px solid var(--border)', position: 'relative', zIndex: 1, animation: 'slideIn .2s ease', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <DrawerContent />
          </div>
        </div>
      )}
      </>}

      <CreateModal
        open={createOpen}
        createName={createName} setCreateName={setCreateName}
        createEmail={createEmail} setCreateEmail={setCreateEmail}
        createAdminName={createAdminName} setCreateAdminName={setCreateAdminName}
        createLoading={createLoading}
        createResult={createResult}
        onSubmit={submitCreate}
        onClose={() => { setCreateOpen(false); setCreateResult(null); setCreateName(''); setCreateEmail(''); setCreateAdminName('') }}
      />

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0 }
          to   { transform: translateX(0);    opacity: 1 }
        }
      `}</style>
    </div>
  )
}

// ─── Create Tenant Modal (shared) ────────────────────────────────────────
function CreateModal({ open, createName, setCreateName, createEmail, setCreateEmail, createAdminName, setCreateAdminName, createLoading, createResult, onSubmit, onClose }: {
  open: boolean; createName: string; setCreateName: (v: string) => void
  createEmail: string; setCreateEmail: (v: string) => void
  createAdminName: string; setCreateAdminName: (v: string) => void
  createLoading: boolean; createResult: { password: string } | null
  onSubmit: () => void; onClose: () => void
}) {
  if (!open) return null
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24 }}>
        {createResult ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)', marginBottom: 16 }}>✓ Tenant Created</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>Temp password — share with customer:</div>
            <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: 'var(--amber)', background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px', letterSpacing: '.5px', userSelect: 'all', marginBottom: 20 }}>
              {createResult.password}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 20 }}>They should change this after first login.</div>
            <button onClick={onClose} style={{ width: '100%', padding: '11px 0', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 20 }}>New Tenant</div>
            {[
              { label: 'Company Name', value: createName, set: setCreateName, ph: 'Acme HVAC' },
              { label: 'Admin Full Name', value: createAdminName, set: setCreateAdminName, ph: 'John Smith' },
              { label: 'Admin Email', value: createEmail, set: setCreateEmail, ph: 'john@acmehvac.com' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{f.label}</label>
                <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                  style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, padding: '9px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            ))}
            <button onClick={onSubmit} disabled={createLoading || !createName.trim() || !createEmail.trim() || !createAdminName.trim()}
              style={{ width: '100%', padding: '11px 0', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: createLoading ? 'wait' : 'pointer', opacity: createLoading || !createName.trim() || !createEmail.trim() || !createAdminName.trim() ? 0.6 : 1, marginBottom: 8 }}>
              {createLoading ? 'Creating…' : 'Create Tenant'}
            </button>
            <button onClick={onClose}
              style={{ width: '100%', padding: '9px 0', background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
