'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type TenantRow = {
  id: string; name: string; slug: string; active: boolean; createdAt: string
  subscriptionStatus: string; trialEndsAt: string | null; currentPeriodEnd: string | null
  stripeCustomerId: string | null; userCount: number; jobsThisMonth: number
  lastActivity: string; totalRevenue: number
}

type PlatformStats = {
  totalTenants: number; mrr: number; totalUsers: number
  totalJobsThisMonth: number; activeCount: number; trialCount: number
}

type TenantDetail = TenantRow & {
  users: { id: string; name: string; email: string; initials: string; role: string; active: boolean; createdAt: string }[]
  jobsThisMonth: number; totalJobs: number; totalRevenue: number
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
      alerts.push({ type: 'info', tenantId: t.id, tenantName: t.name, msg: `No activity in ${daysSinceActive}d` })
    }
  }
  return alerts
}

const ALERT_ICON: Record<string, string> = { error: '⚠', warn: '⏱', info: '💤' }
const ALERT_COLOR: Record<string, string> = { error: 'var(--red)', warn: 'var(--amber)', info: 'var(--text4)' }

function StatCard({ value, label, sub, color }: { value: string; label: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', minWidth: 0 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color ?? 'var(--text)', letterSpacing: '-.5px' }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function SuperAdminClient({ tenants, stats }: { tenants: TenantRow[]; stats: PlatformStats }) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
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
  const [createResult, setCreateResult] = useState<{ password: string; tenantId: string } | null>(null)

  const alerts = useMemo(() => buildAlerts(tenants), [tenants])

  const TABS = ['all', 'active', 'trialing', 'past_due', 'cancelled']

  const filtered = useMemo(() => {
    let list = tenants
    if (filter !== 'all') list = list.filter(t => t.subscriptionStatus === filter)
    if (search.trim()) list = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [tenants, filter, search])

  async function openDetail(id: string) {
    setSelectedId(id)
    setDetail(null)
    setDetailLoading(true)
    const res = await fetch(`/api/superadmin/tenant/${id}`)
    if (res.ok) setDetail(await res.json())
    setDetailLoading(false)
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
    if (res.ok) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setImpersonating(false)
    }
  }

  async function submitCreate() {
    if (!createName.trim() || !createEmail.trim() || !createAdminName.trim()) return
    setCreateLoading(true)
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: createName.trim(),
        name: createAdminName.trim(),
        email: createEmail.trim(),
        password: '__SUPERADMIN_CREATED__',
        superadminCreate: true,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setCreateResult({ password: data.tempPassword ?? '(see invite email)', tenantId: data.tenantId ?? '' })
      router.refresh()
    }
    setCreateLoading(false)
  }

  const tenant = selectedId ? tenants.find(t => t.id === selectedId) : null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: 'var(--bg2)' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.3px' }}>
            🎛 Command Center
          </div>
          <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>WorkForge platform administration</div>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          style={{ marginLeft: 'auto', padding: '8px 16px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
        >
          + New Tenant
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, flexShrink: 0 }}>
        <StatCard value={String(stats.totalTenants)} label="Total Tenants" />
        <StatCard value={`$${stats.mrr.toLocaleString()}`} label="MRR" sub={`${stats.activeCount} paid`} color={stats.mrr > 0 ? 'var(--green)' : 'var(--text4)'} />
        <StatCard value={String(stats.activeCount)} label="Active" sub="paid subscribers" color="var(--green)" />
        <StatCard value={String(stats.trialCount)} label="Trialing" color="#5ba3f5" />
        <StatCard value={String(stats.totalUsers)} label="Total Users" />
        <StatCard value={String(stats.totalJobsThisMonth)} label="Jobs This Month" />
      </div>

      {/* Main body: roster + sidebar */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

        {/* Tenant roster */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Filters + search */}
          <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, background: 'var(--bg)' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {TABS.map(tab => (
                <button key={tab} onClick={() => setFilter(tab)}
                  style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid var(--border)', background: filter === tab ? 'var(--amber)' : 'var(--bg3)', color: filter === tab ? '#080c1a' : 'var(--text3)', whiteSpace: 'nowrap', transition: 'all .15s' }}>
                  {tab === 'past_due' ? 'Past Due' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab !== 'all' && (
                    <span style={{ marginLeft: 5, opacity: .7 }}>
                      {tenants.filter(t => t.subscriptionStatus === tab).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tenants…"
              style={{ marginLeft: 'auto', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '6px 12px', outline: 'none', fontFamily: 'inherit', width: 200 }}
            />
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
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text4)', fontSize: 13 }}>
                No tenants match this filter
              </div>
            )}
            {filtered.map(t => {
              const st = STATUS_CFG[t.subscriptionStatus] ?? STATUS_CFG.trialing
              const isSelected = selectedId === t.id
              const trialDays = t.trialEndsAt ? Math.ceil((new Date(t.trialEndsAt).getTime() - Date.now()) / 86400000) : null

              return (
                <div key={t.id} onClick={() => openDetail(t.id)}
                  style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: '1fr 100px 60px 60px 90px 90px 40px', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isSelected ? 'rgba(245,158,11,.05)' : 'transparent', transition: 'background .1s', borderLeft: isSelected ? '3px solid var(--amber)' : '3px solid transparent' }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg2)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.active ? 'var(--text)' : 'var(--text4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {t.name}
                      {!t.active && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text4)', background: 'var(--bg4)', padding: '1px 6px', borderRadius: 10 }}>SUSPENDED</span>}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{t.slug}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border}`, padding: '3px 8px', borderRadius: 20 }}>
                      {st.dot} {st.label}
                    </span>
                    {t.subscriptionStatus === 'trialing' && trialDays !== null && (
                      <div style={{ fontSize: 9, color: trialDays <= 3 ? 'var(--red)' : 'var(--text4)', marginTop: 3 }}>
                        {trialDays > 0 ? `${trialDays}d left` : 'expired'}
                      </div>
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

        {/* Right sidebar: alerts + detail */}
        <div style={{ width: 260, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto', background: 'var(--bg2)' }}>
          {alerts.length > 0 && (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                Alerts · {alerts.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map((a, i) => (
                  <div key={i} onClick={() => openDetail(a.tenantId)}
                    style={{ padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8, border: `1px solid var(--border)`, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = ALERT_COLOR[a.type]}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
                  >
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
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
              Recent Signups
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tenants.slice(0, 6).map(t => (
                <div key={t.id} onClick={() => openDetail(t.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
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

      {/* Tenant detail drawer */}
      {selectedId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 800, display: 'flex', justifyContent: 'flex-end' }} onClick={e => { if (e.target === e.currentTarget) setSelectedId(null) }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)' }} onClick={() => setSelectedId(null)} />
          <div style={{ width: 380, background: 'var(--bg2)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, animation: 'slideIn .2s ease', overflowY: 'auto' }}>

            {/* Drawer header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{tenant?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{tenant?.slug}</div>
                </div>
                <button onClick={() => setSelectedId(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text4)', padding: 4, lineHeight: 1 }}>✕</button>
              </div>
              {tenant && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {(() => {
                    const st = STATUS_CFG[tenant.subscriptionStatus] ?? STATUS_CFG.trialing
                    return <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border}`, padding: '3px 9px', borderRadius: 20 }}>{st.dot} {st.label}</span>
                  })()}
                  {!tenant.active && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', background: 'var(--bg4)', padding: '3px 9px', borderRadius: 20 }}>SUSPENDED</span>}
                  <span style={{ fontSize: 10, color: 'var(--text4)' }}>Joined {joinedDate(tenant.createdAt)}</span>
                </div>
              )}
            </div>

            {detailLoading && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text4)', fontSize: 12 }}>Loading…</div>
            )}

            {detail && (
              <>
                {/* Stats row */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { v: String(detail.userCount), l: 'Users' },
                    { v: String(detail.jobsThisMonth), l: 'Jobs/mo' },
                    { v: `$${Math.round(detail.totalRevenue).toLocaleString()}`, l: 'Revenue' },
                  ].map(k => (
                    <div key={k.l} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{k.v}</div>
                      <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{k.l}</div>
                    </div>
                  ))}
                </div>

                {/* Subscription */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Subscription</div>
                  {detail.subscriptionStatus === 'trialing' && detail.trialEndsAt && (
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                      Trial ends {new Date(detail.trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                  {detail.subscriptionStatus === 'active' && detail.currentPeriodEnd && (
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                      Renews {new Date(detail.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                  {detail.stripeCustomerId && (
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 4, fontFamily: 'monospace' }}>{detail.stripeCustomerId}</div>
                  )}
                  {!detail.stripeCustomerId && (
                    <div style={{ fontSize: 11, color: 'var(--text4)' }}>No Stripe account yet</div>
                  )}
                </div>

                {/* Users */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                    Users · {detail.users.length}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {detail.users.slice(0, 8).map(u => (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: u.role === 'admin' ? 'var(--amber)' : 'var(--bg4)', color: u.role === 'admin' ? '#080c1a' : 'var(--text3)', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: u.active ? 1 : 0.4 }}>
                          {u.initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: u.active ? 'var(--text2)' : 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text4)', background: 'var(--bg3)', padding: '2px 6px', borderRadius: 10, textTransform: 'capitalize', flexShrink: 0 }}>
                          {u.role}
                        </span>
                      </div>
                    ))}
                    {detail.users.length > 8 && (
                      <div style={{ fontSize: 11, color: 'var(--text4)', paddingLeft: 34 }}>+{detail.users.length - 8} more</div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Actions</div>

                  <button onClick={startImpersonate} disabled={impersonating}
                    style={{ width: '100%', padding: '10px 0', background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.3)', color: 'var(--amber)', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: impersonating ? 'wait' : 'pointer', opacity: impersonating ? 0.6 : 1 }}>
                    {impersonating ? 'Switching…' : '👤 Impersonate this account'}
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button onClick={() => runAction('toggle_active')} disabled={actionLoading !== null}
                      style={{ padding: '9px 0', background: 'var(--bg3)', border: '1px solid var(--border)', color: detail.active ? 'var(--red)' : 'var(--green)', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: actionLoading ? 0.6 : 1 }}>
                      {actionLoading === 'toggle_active' ? '…' : detail.active ? '⏸ Suspend' : '▶ Reactivate'}
                    </button>
                    <button onClick={() => runAction('extend_trial')} disabled={actionLoading !== null}
                      style={{ padding: '9px 0', background: 'var(--bg3)', border: '1px solid var(--border)', color: '#5ba3f5', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: actionLoading ? 0.6 : 1 }}>
                      {actionLoading === 'extend_trial' ? '…' : '⏱ +14d Trial'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create tenant modal */}
      {createOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) { setCreateOpen(false); setCreateResult(null) } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24 }}>
            {createResult ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)', marginBottom: 16 }}>✓ Tenant Created</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>Temporary password — share with customer:</div>
                <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: 'var(--amber)', background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', letterSpacing: '.5px', userSelect: 'all', marginBottom: 20 }}>
                  {createResult.password}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 20 }}>The customer should change this after first login.</div>
                <button onClick={() => { setCreateOpen(false); setCreateResult(null); setCreateName(''); setCreateEmail(''); setCreateAdminName('') }}
                  style={{ width: '100%', padding: '10px 0', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Done
                </button>
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
                <button onClick={submitCreate} disabled={createLoading || !createName.trim() || !createEmail.trim() || !createAdminName.trim()}
                  style={{ width: '100%', padding: '11px 0', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: createLoading ? 'wait' : 'pointer', opacity: createLoading || !createName.trim() || !createEmail.trim() || !createAdminName.trim() ? 0.6 : 1, marginBottom: 8 }}>
                  {createLoading ? 'Creating…' : 'Create Tenant'}
                </button>
                <button onClick={() => setCreateOpen(false)}
                  style={{ width: '100%', padding: '9px 0', background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0 }
          to { transform: translateX(0); opacity: 1 }
        }
      `}</style>
    </div>
  )
}
