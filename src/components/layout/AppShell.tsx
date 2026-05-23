'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { SessionUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { useState, useEffect, useCallback } from 'react'
import { useLang } from '@/components/LangProvider'
import { useIsMobile } from '@/lib/useIsMobile'
import type { TKeys } from '@/lib/i18n'
import SupportChat from '@/components/SupportChat'
import SidebarCustomizeDrawer from '@/components/layout/SidebarCustomizeDrawer'

// ── Nav structure ─────────────────────────────────────────────────────────────

type NavItem = { href: string; icon: React.ReactNode; labelKey: TKeys; perm: string | null }
type NavGroup = { label: string; key: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations', key: 'operations',
    items: [
      { href: '/jobs',      icon: '🔧', labelKey: 'workOrders', perm: null },
      { href: '/schedule',  icon: '📅', labelKey: 'schedule',   perm: 'assignTech' },
      { href: '/field',     icon: '📱', labelKey: 'fieldView',  perm: null },
      { href: '/equipment', icon: '⚙',  labelKey: 'equipment',  perm: 'viewEquipment' },
      { href: '/import',    icon: '📥', labelKey: 'importDocs', perm: 'importData' },
    ],
  },
  {
    label: 'Finances', key: 'finances',
    items: [
      { href: '/invoices',  icon: '💰', labelKey: 'invoices',  perm: 'viewFinancials' },
      { href: '/estimates', icon: '📝', labelKey: 'estimates', perm: 'createEstimate' },
      { href: '/contracts', icon: '📑', labelKey: 'contracts', perm: 'viewContracts' },
      { href: '/billing',   icon: '💳', labelKey: 'billing',   perm: 'manageBilling' },
    ],
  },
  {
    label: 'Resources', key: 'resources',
    items: [
      { href: '/team',      icon: '👥', labelKey: 'team',            perm: null },
      { href: '/feedback',  icon: '💡', labelKey: 'featureRequests', perm: null },
    ],
  },
  {
    label: 'Reports', key: 'reports',
    items: [
      { href: '/history',   icon: '📋', labelKey: 'jobHistory',    perm: 'viewHistory' },
      { href: '/audit',     icon: '🛡',  labelKey: 'auditLog',      perm: 'viewAudit' },
      { href: '/marketing', icon: '📣', labelKey: 'marketing',     perm: 'manageSettings' },
      { href: '/cron',      icon: '⏱',  labelKey: 'scheduledJobs', perm: 'manageSettings' },
    ],
  },
]

const SUPERADMIN_ONLY: NavItem[] = [
  { href: '/superadmin', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>, labelKey: 'commandCenter', perm: 'superAdminView' },
]

const BOTTOM_TABS: Record<string, { href: string; icon: React.ReactNode; labelKey: TKeys }[]> = {
  tech: [
    { href: '/field',    icon: '📱', labelKey: 'fieldView'  },
    { href: '/jobs',     icon: '🔧', labelKey: 'workOrders' },
    { href: '/schedule', icon: '📅', labelKey: 'schedule'   },
  ],
  dispatcher: [
    { href: '/jobs',     icon: '🔧', labelKey: 'workOrders' },
    { href: '/schedule', icon: '📅', labelKey: 'schedule'   },
    { href: '/estimates',icon: '📝', labelKey: 'estimates'  },
    { href: '/team',     icon: '👥', labelKey: 'team'       },
  ],
  admin: [
    { href: '/dashboard', icon: '📊', labelKey: 'dashboard'  },
    { href: '/jobs',      icon: '🔧', labelKey: 'workOrders' },
    { href: '/schedule',  icon: '📅', labelKey: 'schedule'   },
    { href: '/invoices',  icon: '💰', labelKey: 'invoices'   },
  ],
  superadmin: [
    { href: '/superadmin', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>, labelKey: 'commandCenter' },
  ],
}

const ROLE_COLOR: Record<string, string> = {
  superadmin: '#a78bfa',
  admin:      '#f59e0b',
  dispatcher: '#5ba3f5',
  tech:       '#22c55e',
  readonly:   '#64748b',
}

// ── Impersonation banner ──────────────────────────────────────────────────────

function ImpersonationBanner({ company }: { company: string }) {
  const router = useRouter()
  const [exiting, setExiting] = useState(false)

  async function exit() {
    setExiting(true)
    await fetch('/api/superadmin/exit-impersonate', { method: 'POST' })
    router.push('/superadmin')
    router.refresh()
  }

  return (
    <div style={{
      background: 'rgba(239,68,68,.1)', borderBottom: '1px solid rgba(239,68,68,.22)',
      padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, zIndex: 200,
    }}>
      <span style={{ fontSize: 14 }}>👤</span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#fca5a5' }}>
        Viewing as <strong style={{ color: '#fff' }}>{company}</strong> — changes affect real tenant data
      </span>
      <button onClick={exit} disabled={exiting} style={{
        padding: '6px 16px', background: 'rgba(239,68,68,.8)', color: '#fff',
        border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
        cursor: exiting ? 'wait' : 'pointer', opacity: exiting ? .6 : 1,
        minHeight: 36,
      }}>
        {exiting ? '…' : 'Exit'}
      </button>
    </div>
  )
}

// ── Logo mark ─────────────────────────────────────────────────────────────────

function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, background: 'var(--amber)', borderRadius: Math.round(size * .27),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, boxShadow: '0 2px 8px rgba(245,158,11,.35)',
    }}>
      <svg viewBox="-44 -44 88 88" style={{ width: size * .5, height: size * .5 }}>
        <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="#060a17" />
      </svg>
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────

export default function AppShell({ session, children }: { session: SessionUser; children: React.ReactNode }) {
  const pathname       = usePathname()
  const router         = useRouter()
  const [userMenuOpen, setUserMenuOpen]   = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [supportOpen, setSupportOpen]     = useState(false)
  const [notifState, setNotifState]       = useState<'unsupported' | 'denied' | 'granted' | 'default'>('default')
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(true)
  const { lang, setLang, t } = useLang()
  const isMobile  = useIsMobile()
  const roleColor = ROLE_COLOR[session.role] ?? '#64748b'

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [hiddenItems, setHiddenItems]         = useState<Set<string>>(new Set())
  const [customizeOpen, setCustomizeOpen]     = useState(false)

  useEffect(() => {
    fetch('/api/users/me/sidebar-prefs')
      .then(r => { if (!r.ok) return; return r.json() })
      .then((prefs: { collapsedGroups?: unknown; hiddenItems?: unknown } | undefined) => {
        if (!prefs) return
        if (Array.isArray(prefs.collapsedGroups)) setCollapsedGroups(new Set(prefs.collapsedGroups.filter((x): x is string => typeof x === 'string')))
        if (Array.isArray(prefs.hiddenItems))     setHiddenItems(new Set(prefs.hiddenItems.filter((x): x is string => typeof x === 'string')))
      })
      .catch(() => {})
  }, [])

  function toggleGroup(key: string) {
    const next = new Set(collapsedGroups)
    if (next.has(key)) next.delete(key); else next.add(key)
    setCollapsedGroups(next)
    const prefs = { collapsedGroups: [...next], hiddenItems: [...hiddenItems] }
    fetch('/api/users/me/sidebar-prefs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prefs) }).catch(() => {})
  }

  useEffect(() => { setMobileNavOpen(false) }, [pathname])

  useEffect(() => {
    if (typeof Notification === 'undefined') { setNotifState('unsupported'); return }
    const perm = Notification.permission as 'denied' | 'granted' | 'default'
    setNotifState(perm)
    if (perm === 'default') {
      const dismissed = sessionStorage.getItem('notif-banner-dismissed')
      if (!dismissed) setNotifBannerDismissed(false)
    }
  }, [])

  const subscribeToPush = useCallback(async () => {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return
    const permission = await Notification.requestPermission()
    setNotifState(permission as 'denied' | 'granted' | 'default')
    setNotifBannerDismissed(true)
    sessionStorage.setItem('notif-banner-dismissed', '1')
    if (permission !== 'granted') return
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })
    if (!sub) return
    const json = sub.toJSON()
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
    })
  }, [])

  function dismissNotifBanner() {
    setNotifBannerDismissed(true)
    sessionStorage.setItem('notif-banner-dismissed', '1')
  }

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  async function handleLogout() {
    const sw = navigator.serviceWorker?.controller
    if (sw) sw.postMessage({ type: 'CLEAR_USER_DATA' })
    Object.keys(localStorage).filter(k => k.startsWith('wf-')).forEach(k => localStorage.removeItem(k))
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const isSuperadminOnly = session.role === 'superadmin' && !session.impersonating
  const visibleGroups: NavGroup[] = isSuperadminOnly
    ? [{ label: 'Platform', key: 'platform', items: SUPERADMIN_ONLY.filter(i => !i.perm || can(session.role, i.perm)) }]
    : NAV_GROUPS.map(g => ({
        ...g,
        items: g.items.filter(i => !i.perm || can(session.role, i.perm)),
      })).filter(g => g.items.length > 0)

  const bottomTabs = BOTTOM_TABS[session.role] ?? BOTTOM_TABS.tech

  // ── Desktop nav link ─────────────────────────────────────────────────────

  const navLink = (item: NavItem, large?: boolean) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    const fs = large ? 15 : 13
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileNavOpen(false)}
        title={item.labelKey}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: large ? '13px 16px' : '9px 13px',
          borderRadius: 10,
          fontSize: fs,
          fontWeight: active ? 700 : 500,
          color: active ? 'var(--amber)' : 'var(--text3)',
          background: active ? 'var(--amber-dim)' : 'transparent',
          textDecoration: 'none',
          transition: 'all var(--dur) ease',
          letterSpacing: '-.1px',
          position: 'relative',
          minHeight: 44,  /* WCAG touch target */
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text2)' } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)' } }}
      >
        {/* Active indicator bar */}
        {active && (
          <div style={{
            position: 'absolute', left: 0, top: '20%', bottom: '20%',
            width: 3, background: 'var(--amber)', borderRadius: '0 3px 3px 0',
          }} />
        )}
        <span style={{
          fontSize: large ? 19 : 16,
          width: large ? 24 : 20,
          textAlign: 'center',
          flexShrink: 0,
          lineHeight: 1,
          opacity: active ? 1 : .8,
        }}>
          {item.icon}
        </span>
        <span style={{ flex: 1 }}>{t(item.labelKey)}</span>
      </Link>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={{
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 14,
        flexShrink: 0,
        zIndex: 100,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      } as React.CSSProperties}>

        {/* Hamburger — mobile only */}
        {isMobile && (
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', padding: '8px', display: 'flex',
              alignItems: 'center', borderRadius: 8, minWidth: 44, minHeight: 44,
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <rect y="0"  width="18" height="2" rx="1" fill="currentColor" />
              <rect y="6"  width="14" height="2" rx="1" fill="currentColor" />
              <rect y="12" width="18" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
        )}

        {/* Logo */}
        <Link href={session.role === 'tech' ? '/field' : '/jobs'} style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
          <LogoMark size={32} />
          {!isMobile && (
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.5px' }}>
              <span style={{ color: 'var(--text)' }}>Work</span>
              <span style={{ color: 'var(--amber)' }}>Forge</span>
            </span>
          )}
        </Link>

        {/* Live dot — desktop */}
        {!isMobile && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text4)', fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2s ease infinite', flexShrink: 0 }} />
              Live
            </div>
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Right side actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            aria-label={`Switch to ${lang === 'en' ? 'Spanish' : 'English'}`}
            style={{
              background: 'var(--bg4)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '0 12px', fontSize: 11, fontWeight: 700,
              color: 'var(--text3)', cursor: 'pointer', letterSpacing: '.5px',
              transition: 'all var(--dur) ease', height: 36,
              display: 'flex', alignItems: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.color = 'var(--text3)' }}
          >
            {lang === 'en' ? 'ES' : 'EN'}
          </button>

          {/* Notification bell */}
          {notifState !== 'unsupported' && (
            <button
              onClick={notifState !== 'granted' ? subscribeToPush : undefined}
              aria-label={notifState === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
              title={notifState === 'denied' ? 'Notifications blocked — check browser settings' : 'Push notifications'}
              style={{
                background: notifState === 'granted' ? 'var(--amber-dim)' : 'var(--bg4)',
                border: `1px solid ${notifState === 'granted' ? 'var(--amber-border)' : 'var(--border)'}`,
                borderRadius: 8, width: 36, height: 36, fontSize: 15,
                cursor: notifState === 'granted' ? 'default' : 'pointer', lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all var(--dur) ease',
              }}
            >
              {notifState === 'denied' ? '🔕' : '🔔'}
            </button>
          )}

          {/* User avatar / menu trigger */}
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            aria-label="Account menu"
            aria-expanded={userMenuOpen}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              background: 'var(--bg4)', border: `1px solid ${userMenuOpen ? 'var(--border2)' : 'var(--border)'}`,
              borderRadius: 24, padding: isMobile ? '4px' : '4px 12px 4px 4px',
              cursor: 'pointer', transition: 'all var(--dur) ease',
              minHeight: 44,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
            onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: roleColor, color: '#060a17',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, flexShrink: 0, letterSpacing: '-.3px',
            }}>
              {session.initials}
            </div>
            {!isMobile && (
              <div style={{ textAlign: 'left', minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>{session.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'capitalize', letterSpacing: '.2px' }}>{session.role}</div>
              </div>
            )}
            {!isMobile && (
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ color: 'var(--text4)', flexShrink: 0, transition: 'transform var(--dur) ease', transform: userMenuOpen ? 'rotate(180deg)' : 'none' }}>
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>

          {/* User dropdown */}
          {userMenuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 498 }} onClick={() => setUserMenuOpen(false)} />
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                background: 'var(--bg2)', border: '1px solid var(--border2)',
                borderRadius: 14, padding: '6px', minWidth: 220, zIndex: 499,
                boxShadow: 'var(--shadow-xl)', animation: 'scaleIn 140ms var(--ease)',
                transformOrigin: 'top right',
              }}>
                {/* User info */}
                <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: roleColor,
                      color: '#060a17', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800, flexShrink: 0,
                    }}>
                      {session.initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{session.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.email}</div>
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 10,
                    background: `${roleColor}20`, color: roleColor,
                    border: `1px solid ${roleColor}30`,
                    textTransform: 'capitalize', letterSpacing: '.3px',
                  }}>
                    {session.role} access
                  </span>
                </div>
                {/* Menu items */}
                {[
                  { icon: '🔐', label: 'Security (2FA)', action: () => { setUserMenuOpen(false); router.push('/settings/2fa') }, danger: false },
                  { icon: '🖥️', label: 'Active Sessions', action: () => { setUserMenuOpen(false); router.push('/settings/sessions') }, danger: false },
                  { icon: '💬', label: 'Support', action: () => { setUserMenuOpen(false); setSupportOpen(true) }, danger: false },
                  { icon: '🚪', label: t('signOut'), action: () => { setUserMenuOpen(false); handleLogout() }, danger: true },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 9, cursor: 'pointer',
                      fontSize: 13, fontWeight: 600,
                      color: item.danger ? 'var(--red)' : 'var(--text2)',
                      background: 'transparent', border: 'none', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'background var(--dur) ease, color var(--dur) ease',
                      minHeight: 44,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,.08)' : 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Impersonation banner ───────────────────────────────────────── */}
      {session.impersonating && <ImpersonationBanner company={session.company} />}

      {/* ── Push notification prompt ──────────────────────────────────── */}
      {!notifBannerDismissed && notifState === 'default' && (
        <div style={{
          background: 'var(--amber-dim)', borderBottom: '1px solid var(--amber-border)',
          padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0, zIndex: 99,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🔔</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Stay in the loop</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Get instant alerts when jobs are assigned or updated</div>
          </div>
          <button onClick={subscribeToPush} className="btn btn-primary btn-sm">Enable</button>
          <button
            onClick={dismissNotifBanner}
            aria-label="Dismiss"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text4)', padding: 6, lineHeight: 1, flexShrink: 0, borderRadius: 6 }}
          >✕</button>
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Desktop sidebar ─────────────────────────────────────────── */}
        {!isMobile && (
          <nav
            aria-label="Main navigation"
            style={{
              width: 240,                         /* up from 210 */
              background: 'var(--bg2)',
              borderRight: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column',
              flexShrink: 0, overflowY: 'auto',
            }}
          >
            <div style={{ padding: '12px 10px 8px', display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Dashboard — top-level standalone link */}
              {can(session.role, 'viewDashboard') && navLink({ href: '/dashboard', icon: '📊', labelKey: 'dashboard', perm: 'viewDashboard' })}
              <div style={{ height: 1, background: 'var(--border)', margin: '6px 10px' }} />

              {visibleGroups.map((group) => {
                const isCollapsed = collapsedGroups.has(group.key)
                const visibleItems = group.items.filter(i => !hiddenItems.has(i.href) && (!i.perm || can(session.role, i.perm)))
                if (visibleItems.length === 0) return null
                return (
                  <div key={group.key}>
                    <button
                      onClick={() => toggleGroup(group.key)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 13px', background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: 9, fontWeight: 800, color: 'var(--text4)',
                        textTransform: 'uppercase', letterSpacing: '1.1px',
                      }}
                    >
                      {group.label}
                      <svg
                        width="8" height="8" viewBox="0 0 8 8" fill="none"
                        style={{ color: 'var(--text4)', transition: 'transform 200ms', transform: isCollapsed ? 'rotate(-90deg)' : 'none', flexShrink: 0 }}
                      >
                        <path d="M1 2.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                    {!isCollapsed && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {visibleItems.map(item => navLink(item))}
                      </div>
                    )}
                    <div style={{ height: 1, background: 'var(--border)', margin: '6px 10px' }} />
                  </div>
                )
              })}
            </div>

            {/* Sidebar footer */}
            <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <button
                onClick={() => setCustomizeOpen(true)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 13px', borderRadius: 10, background: 'transparent',
                  border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 13,
                  fontWeight: 600, textAlign: 'left', transition: 'all var(--dur) ease',
                  minHeight: 44,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text4)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                </svg>
                Customize sidebar
              </button>
              <button
                onClick={() => setSupportOpen(true)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 13px', borderRadius: 10, background: 'transparent',
                  border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 13,
                  fontWeight: 600, textAlign: 'left', transition: 'all var(--dur) ease',
                  minHeight: 44,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Support
              </button>

              {/* Company badge */}
              <div style={{ padding: '10px 13px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, background: `${roleColor}22`,
                  border: `1px solid ${roleColor}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: roleColor, flexShrink: 0,
                }}>
                  {session.initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {session.company || 'WorkForge'}
                  </div>
                  <div style={{ fontSize: 10, color: roleColor, textTransform: 'capitalize', fontWeight: 600, letterSpacing: '.2px', marginTop: 1 }}>
                    {session.role}
                  </div>
                </div>
              </div>
            </div>
          </nav>
        )}

        {/* ── Main content ─────────────────────────────────────────────── */}
        <main
          id="main-content"
          tabIndex={-1}
          className={isMobile ? 'wf-mobile-main' : undefined}
          style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}
          onClick={() => { setUserMenuOpen(false) }}
        >
          {children}
        </main>
      </div>

      {/* ── AppShell mobile styles ───────────────────────────────────── */}
      <style>{`
        /* Bottom padding so content isn't hidden behind the tab bar */
        .wf-mobile-main {
          padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px));
        }
      `}</style>

      {/* ── Mobile bottom tab bar ─────────────────────────────────────── */}
      {isMobile && (
        <nav
          aria-label="Main navigation"
          style={{
            background: 'var(--bg2)', borderTop: '1px solid var(--border)',
            display: 'flex', flexShrink: 0,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)', zIndex: 100,
            boxShadow: '0 -4px 20px rgba(0,0,0,.4)',
          }}
        >
          {bottomTabs.map(tab => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={t(tab.labelKey)}
                aria-current={active ? 'page' : undefined}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '10px 4px 8px', textDecoration: 'none',
                  position: 'relative', minHeight: 60,   /* up from 56 */
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all var(--dur) ease',
                } as React.CSSProperties}
              >
                {active && (
                  <div style={{
                    position: 'absolute', top: 0, left: '18%', right: '18%',
                    height: 2.5, background: 'var(--amber)',
                    borderRadius: '0 0 4px 4px',
                  }} />
                )}
                <span style={{ fontSize: 22, lineHeight: 1, marginBottom: 4, transition: 'transform var(--dur) var(--ease)', transform: active ? 'scale(1.1)' : 'none' }}>{tab.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: active ? 700 : 500,
                  color: active ? 'var(--amber)' : 'var(--text4)',
                  letterSpacing: '.2px', whiteSpace: 'nowrap',
                }}>
                  {t(tab.labelKey)}
                </span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="More navigation"
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '10px 4px 8px', background: 'transparent',
              border: 'none', cursor: 'pointer', minHeight: 60,
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            <span style={{ fontSize: 22, lineHeight: 1, marginBottom: 4, color: 'var(--text3)' }}>⋯</span>
            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text4)', letterSpacing: '.2px' }}>More</span>
          </button>
        </nav>
      )}

      {/* ── Mobile nav drawer ─────────────────────────────────────────── */}
      {isMobile && mobileNavOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex' }}>
          {/* Backdrop */}
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(6,10,23,.7)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } as React.CSSProperties}
            onClick={() => setMobileNavOpen(false)}
          />

          {/* Drawer panel */}
          <nav style={{
            width: 288, height: '100%', background: 'var(--bg2)',
            borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
            position: 'relative', zIndex: 1, animation: 'slideInLeft .2s var(--ease)', overflowY: 'auto',
            boxShadow: 'var(--shadow-xl)',
          }}>
            {/* Drawer header */}
            <div style={{
              padding: '18px 16px 14px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: roleColor,
                  color: '#060a17', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800,
                }}>
                  {session.initials}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.2px' }}>{session.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text4)', textTransform: 'capitalize', marginTop: 1 }}>
                    {session.role} · {session.company}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close menu"
                style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: '50%', width: 32, height: 32, cursor: 'pointer',
                  fontSize: 14, color: 'var(--text4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all var(--dur) ease',
                }}
              >✕</button>
            </div>

            {/* Grouped nav */}
            <div style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', flex: 1, gap: 0 }}>
              {visibleGroups.map((group, gi) => (
                <div key={group.label}>
                  <div style={{
                    fontSize: 9, fontWeight: 800, color: 'var(--text4)',
                    textTransform: 'uppercase', letterSpacing: '1.1px',
                    padding: '10px 13px 5px',
                  }}>
                    {group.label}
                  </div>
                  {group.items.map(item => navLink(item, true))}
                  {gi < visibleGroups.length - 1 && (
                    <div style={{ height: 1, background: 'var(--border)', margin: '8px 13px 4px' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Drawer footer */}
            <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <button
                onClick={() => { setMobileNavOpen(false); setSupportOpen(true) }}
                style={{
                  width: '100%', padding: '13px 14px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 14, color: 'var(--text3)', background: 'transparent',
                  border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                  minHeight: 50, transition: 'all var(--dur) ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Support
              </button>
              <button
                onClick={() => { setMobileNavOpen(false); handleLogout() }}
                style={{
                  width: '100%', padding: '13px 14px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 14, color: 'var(--red)', background: 'transparent',
                  border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                  minHeight: 50, transition: 'background var(--dur) ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 18 }}>🚪</span> {t('signOut')}
              </button>
            </div>
          </nav>
        </div>
      )}

      {supportOpen && <SupportChat onClose={() => setSupportOpen(false)} />}
      {customizeOpen && (
        <SidebarCustomizeDrawer
          groups={visibleGroups}
          hiddenItems={hiddenItems}
          onHiddenChange={(next) => {
            setHiddenItems(next)
            const prefs = { collapsedGroups: [...collapsedGroups], hiddenItems: [...next] }
            fetch('/api/users/me/sidebar-prefs', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(prefs),
            }).catch(() => {})
          }}
          onClose={() => setCustomizeOpen(false)}
        />
      )}
    </div>
  )
}
