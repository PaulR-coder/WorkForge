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

// ── Nav structure ────────────────────────────────────────────────────────────

type NavItem = { href: string; icon: string; labelKey: TKeys; perm: string | null }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operations',
    items: [
      { href: '/jobs',      icon: '🔧', labelKey: 'workOrders', perm: null },
      { href: '/estimates', icon: '📝', labelKey: 'estimates',  perm: 'createEstimate' },
      { href: '/import',    icon: '📥', labelKey: 'importDocs', perm: 'importData' },
      { href: '/schedule',  icon: '📅', labelKey: 'schedule',   perm: 'assignTech' },
      { href: '/field',     icon: '📱', labelKey: 'fieldView',  perm: null },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/invoices', icon: '💰', labelKey: 'invoices', perm: 'viewFinancials' },
      { href: '/payments', icon: '💳', labelKey: 'payments', perm: 'viewFinancials' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { href: '/equipment', icon: '⚙',  labelKey: 'equipment',  perm: 'viewEquipment'  },
      { href: '/contracts', icon: '📑', labelKey: 'contracts',  perm: 'viewContracts'  },
      { href: '/team',      icon: '👥', labelKey: 'team',       perm: null             },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/dashboard', icon: '📊', labelKey: 'dashboard', perm: 'viewDashboard' },
      { href: '/history',   icon: '📋', labelKey: 'jobHistory', perm: 'viewHistory'  },
      { href: '/audit',     icon: '🛡', labelKey: 'auditLog',  perm: 'viewAudit'     },
      { href: '/billing',   icon: '💳', labelKey: 'billing',   perm: 'manageBilling' },
    ],
  },
]

const SUPERADMIN_ONLY: NavItem[] = [
  { href: '/superadmin', icon: '🎛', labelKey: 'commandCenter', perm: 'superAdminView' },
  { href: '/jobs',       icon: '🔧', labelKey: 'workOrders',    perm: null },
  { href: '/team',       icon: '👥', labelKey: 'team',          perm: null },
  { href: '/audit',      icon: '🛡', labelKey: 'auditLog',      perm: 'viewAudit' },
  { href: '/billing',    icon: '💳', labelKey: 'billing',       perm: 'manageBilling' },
]

const BOTTOM_TABS: Record<string, { href: string; icon: string; labelKey: TKeys }[]> = {
  tech: [
    { href: '/field',    icon: '📱', labelKey: 'fieldView'   },
    { href: '/jobs',     icon: '🔧', labelKey: 'workOrders'  },
    { href: '/schedule', icon: '📅', labelKey: 'schedule'    },
  ],
  dispatcher: [
    { href: '/jobs',     icon: '🔧', labelKey: 'workOrders' },
    { href: '/schedule', icon: '📅', labelKey: 'schedule'   },
    { href: '/team',     icon: '👥', labelKey: 'team'       },
  ],
  admin: [
    { href: '/dashboard', icon: '📊', labelKey: 'dashboard'  },
    { href: '/jobs',      icon: '🔧', labelKey: 'workOrders' },
    { href: '/schedule',  icon: '📅', labelKey: 'schedule'   },
    { href: '/team',      icon: '👥', labelKey: 'team'       },
  ],
  superadmin: [
    { href: '/superadmin', icon: '🎛', labelKey: 'commandCenter' },
    { href: '/jobs',       icon: '🔧', labelKey: 'workOrders'    },
    { href: '/team',       icon: '👥', labelKey: 'team'          },
  ],
}

// ── Role badge colours ────────────────────────────────────────────────────────

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
      background: 'rgba(239,68,68,.1)', borderBottom: '1px solid rgba(239,68,68,.2)',
      padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, zIndex: 200,
    }}>
      <span style={{ fontSize: 13 }}>👤</span>
      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#fca5a5' }}>
        Viewing as <strong style={{ color: '#fff' }}>{company}</strong> — changes affect real tenant data
      </span>
      <button onClick={exit} disabled={exiting} style={{
        padding: '5px 14px', background: 'rgba(239,68,68,.8)', color: '#fff',
        border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700,
        cursor: exiting ? 'wait' : 'pointer', opacity: exiting ? .6 : 1,
      }}>
        {exiting ? '…' : 'Exit'}
      </button>
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────

export default function AppShell({ session, children }: { session: SessionUser; children: React.ReactNode }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [userMenuOpen, setUserMenuOpen]   = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [supportOpen, setSupportOpen]     = useState(false)
  const [notifState, setNotifState]       = useState<'unsupported' | 'denied' | 'granted' | 'default'>('default')
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(true)
  const { lang, setLang, t } = useLang()
  const isMobile  = useIsMobile()
  const roleColor = ROLE_COLOR[session.role] ?? '#64748b'

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
    Object.keys(localStorage)
      .filter(k => k.startsWith('wf-'))
      .forEach(k => localStorage.removeItem(k))
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  // ── Compute visible nav ───────────────────────────────────────────────────

  const isSuperadminOnly = session.role === 'superadmin' && !session.impersonating

  const visibleGroups = isSuperadminOnly
    ? [{ label: 'Platform', items: SUPERADMIN_ONLY.filter(i => !i.perm || can(session.role, i.perm)) }]
    : NAV_GROUPS.map(g => ({
        ...g,
        items: g.items.filter(i => !i.perm || can(session.role, i.perm)),
      })).filter(g => g.items.length > 0)

  const bottomTabs = BOTTOM_TABS[session.role] ?? BOTTOM_TABS.tech

  // ── Nav link (desktop) ───────────────────────────────────────────────────

  const navLink = (item: NavItem, large?: boolean) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <Link key={item.href} href={item.href} onClick={() => setMobileNavOpen(false)} style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: large ? '11px 14px' : '8px 12px',
        borderRadius: 9,
        fontSize: large ? 14 : 12,
        fontWeight: active ? 700 : 500,
        color: active ? 'var(--amber)' : 'var(--text3)',
        background: active ? 'var(--amber-dim)' : 'transparent',
        borderLeft: `3px solid ${active ? 'var(--amber)' : 'transparent'}`,
        textDecoration: 'none',
        transition: 'all 140ms ease',
        letterSpacing: '-.1px',
      }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text2)' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text3)' }}
      >
        <span style={{ fontSize: large ? 17 : 14, width: large ? 22 : 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
        {t(item.labelKey)}
      </Link>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header style={{
        background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
        height: 54, display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 12, flexShrink: 0, zIndex: 100,
        backdropFilter: 'blur(10px)',
      }}>

        {/* Hamburger — mobile only */}
        {isMobile && (
          <button onClick={() => setMobileNavOpen(true)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 18, color: 'var(--text3)', padding: '4px 6px',
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}>
            ☰
          </button>
        )}

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30, background: 'var(--amber)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="-44 -44 88 88" style={{ width: 16, height: 16 }}>
              <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="#060a17" />
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.5px' }}>
            <span style={{ color: 'var(--text)' }}>Work</span>
            <span style={{ color: 'var(--amber)' }}>Forge</span>
          </span>
        </div>

        {!isMobile && (
          <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />
        )}

        {/* Live indicator */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text4)', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2s ease infinite' }} />
            Live
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>

          {/* Language toggle */}
          <button onClick={() => setLang(lang === 'en' ? 'es' : 'en')} style={{
            background: 'var(--bg4)', border: '1px solid var(--border)',
            borderRadius: 7, padding: '5px 10px', fontSize: 10, fontWeight: 700,
            color: 'var(--text3)', cursor: 'pointer', letterSpacing: '.5px',
            transition: 'all 140ms',
          }}>
            {lang === 'en' ? 'ES' : 'EN'}
          </button>

          {/* Notification bell */}
          {notifState !== 'unsupported' && (
            <button onClick={notifState !== 'granted' ? subscribeToPush : undefined} title={
              notifState === 'granted' ? 'Notifications on' :
              notifState === 'denied'  ? 'Notifications blocked in browser settings' :
              'Enable push notifications'
            } style={{
              background: notifState === 'granted' ? 'var(--amber-dim)' : 'var(--bg4)',
              border: `1px solid ${notifState === 'granted' ? 'var(--amber-border)' : 'var(--border)'}`,
              borderRadius: 7, padding: '5px 8px', fontSize: 13,
              cursor: notifState === 'granted' ? 'default' : 'pointer', lineHeight: 1,
              display: 'flex', alignItems: 'center',
            }}>
              {notifState === 'denied' ? '🔕' : '🔔'}
            </button>
          )}

          {/* User avatar / menu */}
          <button onClick={() => setUserMenuOpen(o => !o)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg4)', border: '1px solid var(--border)',
            borderRadius: 20, padding: isMobile ? '4px' : '4px 12px 4px 4px',
            cursor: 'pointer', transition: 'border-color 140ms',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: roleColor, color: '#060a17',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, flexShrink: 0,
            }}>
              {session.initials}
            </div>
            {!isMobile && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', lineHeight: 1.3 }}>{session.name}</div>
                <div style={{ fontSize: 9, color: 'var(--text4)', textTransform: 'capitalize', letterSpacing: '.3px' }}>{session.role}</div>
              </div>
            )}
          </button>

          {/* User dropdown */}
          {userMenuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 6, minWidth: 200, zIndex: 500,
              boxShadow: 'var(--shadow-lg)', animation: 'scaleIn 140ms ease',
              transformOrigin: 'top right',
            }}>
              <div style={{ padding: '10px 12px 8px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>{session.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{session.email}</div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                  background: `${roleColor}20`, color: roleColor,
                  border: `1px solid ${roleColor}30`, marginTop: 6,
                  textTransform: 'capitalize', letterSpacing: '.3px',
                }}>
                  {session.role}
                </span>
              </div>
              <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
              <button onClick={() => { setUserMenuOpen(false); setSupportOpen(true) }} style={{
                width: '100%', padding: '9px 12px', borderRadius: 7, cursor: 'pointer',
                fontSize: 12, color: 'var(--text3)', background: 'transparent', border: 'none', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                💬 Support
              </button>
              <button onClick={handleLogout} style={{
                width: '100%', padding: '9px 12px', borderRadius: 7, cursor: 'pointer',
                fontSize: 12, color: 'var(--red)', background: 'transparent', border: 'none', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                🚪 {t('signOut')}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Impersonation banner ───────────────────────────────────────── */}
      {session.impersonating && <ImpersonationBanner company={session.company} />}

      {/* ── Push notification prompt ───────────────────────────────────── */}
      {!notifBannerDismissed && notifState === 'default' && (
        <div style={{
          background: 'var(--amber-dim)', borderBottom: '1px solid var(--amber-border)',
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, zIndex: 99,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🔔</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Stay in the loop</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>Get instant alerts when jobs are assigned or updated</div>
          </div>
          <button onClick={subscribeToPush} className="btn btn-primary btn-sm">Enable</button>
          <button onClick={dismissNotifBanner} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 16, color: 'var(--text4)', padding: 4, lineHeight: 1, flexShrink: 0,
          }}>✕</button>
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Desktop sidebar */}
        {!isMobile && (
          <nav style={{
            width: 210, background: 'var(--bg2)', borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto',
          }}>
            <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {visibleGroups.map((group, gi) => (
                <div key={group.label} style={{ marginBottom: gi < visibleGroups.length - 1 ? 6 : 0 }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: 'var(--text4)',
                    textTransform: 'uppercase', letterSpacing: '.9px',
                    padding: '8px 12px 4px',
                  }}>
                    {group.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {group.items.map(item => navLink(item))}
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar footer */}
            <div style={{ marginTop: 'auto', padding: '8px 8px', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setSupportOpen(true)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 12px', borderRadius: 9, background: 'transparent',
                border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12,
                fontWeight: 600, textAlign: 'left', transition: 'all 140ms',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 14 }}>💬</span> Support
              </button>
              <div style={{ padding: '8px 12px 10px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 2 }}>
                  {session.company || 'WorkForge'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                    background: `${roleColor}18`, color: roleColor, border: `1px solid ${roleColor}28`,
                    textTransform: 'capitalize', letterSpacing: '.3px',
                  }}>
                    {session.role}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--text4)' }}>{t('access')}</span>
                </div>
              </div>
            </div>
          </nav>
        )}

        {/* Main content */}
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }} onClick={() => setUserMenuOpen(false)}>
          {children}
        </main>
      </div>

      {/* ── Mobile bottom tab bar ─────────────────────────────────────── */}
      {isMobile && (
        <nav style={{
          background: 'var(--bg2)', borderTop: '1px solid var(--border)',
          display: 'flex', flexShrink: 0,
          paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 100,
        }}>
          {bottomTabs.map(tab => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
            return (
              <Link key={tab.href} href={tab.href} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '8px 4px 6px', textDecoration: 'none',
                position: 'relative', minHeight: 56,
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}>
                {active && (
                  <div style={{
                    position: 'absolute', top: 0, left: '20%', right: '20%',
                    height: 2, background: 'var(--amber)', borderRadius: '0 0 4px 4px',
                  }} />
                )}
                <span style={{ fontSize: 21, lineHeight: 1, marginBottom: 3 }}>{tab.icon}</span>
                <span style={{
                  fontSize: 9, fontWeight: active ? 700 : 500,
                  color: active ? 'var(--amber)' : 'var(--text4)',
                  letterSpacing: '.2px', whiteSpace: 'nowrap',
                }}>
                  {t(tab.labelKey)}
                </span>
              </Link>
            )
          })}

          {/* More button */}
          <button onClick={() => setMobileNavOpen(true)} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '8px 4px 6px', background: 'transparent',
            border: 'none', cursor: 'pointer', minHeight: 56,
            WebkitTapHighlightColor: 'transparent',
          } as React.CSSProperties}>
            <span style={{ fontSize: 21, lineHeight: 1, marginBottom: 3 }}>⋯</span>
            <span style={{ fontSize: 9, fontWeight: 500, color: 'var(--text4)', letterSpacing: '.2px' }}>More</span>
          </button>
        </nav>
      )}

      {/* ── Mobile nav overlay ────────────────────────────────────────── */}
      {isMobile && mobileNavOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)' }} onClick={() => setMobileNavOpen(false)} />
          <nav style={{
            width: 280, height: '100%', background: 'var(--bg2)',
            borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
            position: 'relative', zIndex: 1, animation: 'slideInLeft .22s ease', overflowY: 'auto',
          }}>
            {/* Drawer header */}
            <div style={{
              padding: '16px 16px 12px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: roleColor,
                  color: '#060a17', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800,
                }}>
                  {session.initials}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{session.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'capitalize' }}>{session.role} · {session.company}</div>
                </div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} style={{
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: '50%', width: 28, height: 28, cursor: 'pointer',
                fontSize: 14, color: 'var(--text4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {/* Grouped nav */}
            <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
              {visibleGroups.map((group, gi) => (
                <div key={group.label} style={{ marginBottom: gi < visibleGroups.length - 1 ? 4 : 0 }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: 'var(--text4)',
                    textTransform: 'uppercase', letterSpacing: '.9px',
                    padding: '8px 14px 4px',
                  }}>
                    {group.label}
                  </div>
                  {group.items.map(item => navLink(item, true))}
                </div>
              ))}
            </div>

            {/* Drawer footer */}
            <div style={{ padding: '8px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <button onClick={() => { setMobileNavOpen(false); setSupportOpen(true) }} style={{
                width: '100%', padding: '12px 14px', borderRadius: 9, cursor: 'pointer',
                fontSize: 13, color: 'var(--text3)', background: 'transparent',
                border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                💬 Support
              </button>
              <button onClick={handleLogout} style={{
                width: '100%', padding: '12px 14px', borderRadius: 9, cursor: 'pointer',
                fontSize: 13, color: 'var(--red)', background: 'transparent',
                border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                🚪 {t('signOut')}
              </button>
            </div>
          </nav>
        </div>
      )}

      {supportOpen && <SupportChat onClose={() => setSupportOpen(false)} />}
    </div>
  )
}
