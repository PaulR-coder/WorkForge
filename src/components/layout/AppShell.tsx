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

const NAV_ITEMS: { href: string; icon: string; labelKey: TKeys; perm: string | null }[] = [
  { href: '/superadmin', icon: '🎛', labelKey: 'commandCenter', perm: 'superAdminView' },
  { href: '/dashboard', icon: '📊', labelKey: 'dashboard', perm: 'viewDashboard' },
  { href: '/jobs', icon: '🔧', labelKey: 'workOrders', perm: null },
  { href: '/schedule', icon: '📅', labelKey: 'schedule', perm: 'assignTech' },
  { href: '/field', icon: '📱', labelKey: 'fieldView', perm: null },
  { href: '/invoices', icon: '💰', labelKey: 'invoices', perm: 'viewFinancials' },
  { href: '/payments', icon: '💳', labelKey: 'payments', perm: 'viewFinancials' },
  { href: '/equipment', icon: '⚙', labelKey: 'equipment', perm: 'viewEquipment' },
  { href: '/contracts', icon: '📑', labelKey: 'contracts', perm: 'viewContracts' },
  { href: '/team', icon: '👥', labelKey: 'team', perm: 'manageSettings' },
  { href: '/audit', icon: '🛡', labelKey: 'auditLog', perm: 'viewAudit' },
  { href: '/billing', icon: '💳', labelKey: 'billing', perm: 'manageBilling' },
]

const BOTTOM_TABS: Record<string, { href: string; icon: string; labelKey: TKeys }[]> = {
  tech: [
    { href: '/field',    icon: '📱', labelKey: 'fieldView'   },
    { href: '/jobs',     icon: '🔧', labelKey: 'workOrders'  },
    { href: '/schedule', icon: '📅', labelKey: 'schedule'    },
  ],
  dispatcher: [
    { href: '/dashboard', icon: '📊', labelKey: 'dashboard'  },
    { href: '/jobs',      icon: '🔧', labelKey: 'workOrders' },
    { href: '/schedule',  icon: '📅', labelKey: 'schedule'   },
    { href: '/team',      icon: '👥', labelKey: 'team'       },
  ],
  admin: [
    { href: '/dashboard', icon: '📊', labelKey: 'dashboard'  },
    { href: '/jobs',      icon: '🔧', labelKey: 'workOrders' },
    { href: '/schedule',  icon: '📅', labelKey: 'schedule'   },
    { href: '/team',      icon: '👥', labelKey: 'team'       },
  ],
  superadmin: [
    { href: '/dashboard', icon: '📊', labelKey: 'dashboard'  },
    { href: '/jobs',      icon: '🔧', labelKey: 'workOrders' },
    { href: '/schedule',  icon: '📅', labelKey: 'schedule'   },
    { href: '/team',      icon: '👥', labelKey: 'team'       },
  ],
  readonly: [
    { href: '/dashboard', icon: '📊', labelKey: 'dashboard'  },
    { href: '/jobs',      icon: '🔧', labelKey: 'workOrders' },
  ],
}

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
    <div style={{ background: 'rgba(239,68,68,.15)', borderBottom: '1px solid rgba(239,68,68,.35)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, zIndex: 200 }}>
      <span style={{ fontSize: 14 }}>👤</span>
      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>
        Impersonating <strong>{company}</strong> — changes you make affect this tenant's real data
      </span>
      <button onClick={exit} disabled={exiting}
        style={{ padding: '5px 12px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: exiting ? 'wait' : 'pointer', opacity: exiting ? 0.6 : 1 }}>
        {exiting ? '…' : 'Exit'}
      </button>
    </div>
  )
}

export default function AppShell({ session, children }: { session: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [notifState, setNotifState] = useState<'unsupported' | 'denied' | 'granted' | 'default'>('default')
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(true)
  const { lang, setLang, t } = useLang()
  const isMobile = useIsMobile()

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

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

  const SUPERADMIN_ONLY_HREFS = new Set(['/superadmin', '/team', '/audit', '/billing'])

  const visibleNav = NAV_ITEMS.filter(item => {
    if (session.role === 'superadmin' && !session.impersonating) {
      return SUPERADMIN_ONLY_HREFS.has(item.href)
    }
    if (!item.perm) return true
    return can(session.role, item.perm)
  })

  const bottomTabs = BOTTOM_TABS[session.role] ?? BOTTOM_TABS.readonly

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const navLink = (item: typeof NAV_ITEMS[0], large?: boolean) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <Link key={item.href} href={item.href}
        onClick={() => setMobileNavOpen(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: large ? '13px 16px' : '9px 12px', borderRadius: 9, fontSize: large ? 14 : 12, fontWeight: active ? 700 : 500, color: active ? 'var(--amber)' : 'var(--text3)', background: active ? 'rgba(245,158,11,.08)' : 'transparent', border: active ? '1px solid rgba(245,158,11,.15)' : '1px solid transparent', textDecoration: 'none', transition: 'all .15s' }}>
        <span style={{ fontSize: large ? 18 : 14 }}>{item.icon}</span>
        {t(item.labelKey)}
      </Link>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0, zIndex: 100 }}>

        {/* Hamburger - mobile only (overflow nav for secondary pages) */}
        {isMobile && (
          <button onClick={() => setMobileNavOpen(true)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text3)', padding: '4px 6px', display: 'flex', alignItems: 'center', marginRight: 2, flexShrink: 0 }}>
            ☰
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, color: 'var(--amber)', letterSpacing: '-.5px', flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, background: 'var(--amber)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="-44 -44 88 88" style={{ width: 15, height: 15 }}>
              <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="#080c1a" />
            </svg>
          </div>
          Work<span style={{ color: 'var(--text)' }}>Forge</span>
        </div>

        {!isMobile && <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />}

        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text4)', fontWeight: 600 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s ease infinite' }} />
            Live
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, position: 'relative' }}>
          <button
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 9px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', cursor: 'pointer', letterSpacing: '.5px' }}
          >
            {lang === 'en' ? 'ES' : 'EN'}
          </button>

          {/* Notification bell */}
          {notifState !== 'unsupported' && (
            <button
              onClick={notifState !== 'granted' ? subscribeToPush : undefined}
              title={notifState === 'granted' ? 'Notifications enabled' : notifState === 'denied' ? 'Notifications blocked in browser settings' : 'Enable push notifications'}
              style={{ background: 'var(--bg4)', border: `1px solid ${notifState === 'granted' ? 'rgba(245,158,11,.4)' : 'var(--border)'}`, borderRadius: 8, padding: '4px 8px', fontSize: 14, cursor: notifState === 'granted' ? 'default' : 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center' }}
            >
              {notifState === 'denied' ? '🔕' : '🔔'}
            </button>
          )}
          <button onClick={() => setUserMenuOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 8, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 20, padding: isMobile ? '4px 5px' : '4px 12px 4px 5px', cursor: 'pointer' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--amber)', color: '#080c1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
              {session.initials}
            </div>
            {!isMobile && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>{session.name}</div>
                <div style={{ fontSize: 9, color: 'var(--text4)', textTransform: 'capitalize' }}>{session.role}</div>
              </div>
            )}
          </button>

          {userMenuOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 6, minWidth: 180, zIndex: 500, boxShadow: '0 8px 30px rgba(0,0,0,.5)', animation: 'fadeIn .15s ease' }}>
              <div style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text3)' }}>{session.email}</div>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button onClick={handleLogout} style={{ width: '100%', padding: '9px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 12, color: 'var(--red)', background: 'transparent', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                🚪 {t('signOut')}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Impersonation banner */}
      {session.impersonating && (
        <ImpersonationBanner company={session.company} />
      )}

      {/* Push notification prompt banner */}
      {!notifBannerDismissed && notifState === 'default' && (
        <div style={{ background: 'rgba(245,158,11,.1)', borderBottom: '1px solid rgba(245,158,11,.25)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, zIndex: 99 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🔔</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Enable notifications</div>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 1 }}>Get alerted when jobs are assigned or updated</div>
          </div>
          <button
            onClick={subscribeToPush}
            style={{ padding: '6px 14px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            Enable
          </button>
          <button
            onClick={dismissNotifBanner}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text4)', padding: 4, lineHeight: 1, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar - desktop only */}
        {!isMobile && (
          <nav style={{ width: 200, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
            <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {visibleNav.map(item => navLink(item))}
            </div>
            <div style={{ marginTop: 'auto', padding: '8px 8px 0', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setSupportOpen(true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 9, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12, fontWeight: 600, textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 16 }}>💬</span> Support
              </button>
              <div style={{ padding: '8px 12px 10px', fontSize: 10, color: 'var(--text4)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text3)', marginBottom: 2 }}>{session.company || 'WorkForge'}</div>
                <div style={{ textTransform: 'capitalize' }}>{session.role} {t('access')}</div>
              </div>
            </div>
          </nav>
        )}

        {/* Main content */}
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }} onClick={() => { setUserMenuOpen(false) }}>
          {children}
        </main>
      </div>

      {/* Bottom tab bar - mobile only */}
      {isMobile && (
        <nav style={{
          background: 'var(--bg2)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexShrink: 0,
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 100,
        }}>
          {bottomTabs.map(tab => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
            return (
              <Link key={tab.href} href={tab.href} style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 4px 6px',
                textDecoration: 'none',
                position: 'relative',
                minHeight: 56,
                WebkitTapHighlightColor: 'transparent',
              }}>
                {active && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '25%',
                    right: '25%',
                    height: 2,
                    background: 'var(--amber)',
                    borderRadius: '0 0 3px 3px',
                  }} />
                )}
                <span style={{ fontSize: 22, lineHeight: 1, marginBottom: 3 }}>{tab.icon}</span>
                <span style={{
                  fontSize: 9,
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--amber)' : 'var(--text4)',
                  letterSpacing: '.2px',
                  whiteSpace: 'nowrap',
                }}>
                  {t(tab.labelKey)}
                </span>
              </Link>
            )
          })}

          {/* More — opens full nav drawer */}
          <button
            onClick={() => setMobileNavOpen(true)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 4px 6px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              minHeight: 56,
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            <span style={{ fontSize: 22, lineHeight: 1, marginBottom: 3 }}>⋯</span>
            <span style={{ fontSize: 9, fontWeight: 500, color: 'var(--text4)', letterSpacing: '.2px' }}>
              More
            </span>
          </button>
        </nav>
      )}

      {supportOpen && <SupportChat onClose={() => setSupportOpen(false)} />}

      {/* Mobile nav overlay (all pages + overflow) */}
      {isMobile && mobileNavOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.65)' }} onClick={() => setMobileNavOpen(false)} />
          <nav style={{ width: 270, height: '100%', background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, animation: 'slideInLeft .25s ease', overflowY: 'auto' }}>
            <div style={{ padding: '14px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--amber)', color: '#080c1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                  {session.initials}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>{session.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'capitalize' }}>{session.role}</div>
                </div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text4)', padding: 4, lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              {visibleNav.map(item => navLink(item, true))}
            </div>

            <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <button
                onClick={() => { setMobileNavOpen(false); setSupportOpen(true) }}
                style={{ width: '100%', padding: '13px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 14, color: 'var(--text3)', background: 'transparent', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                💬 Support
              </button>
              <button onClick={handleLogout} style={{ width: '100%', padding: '13px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 14, color: 'var(--red)', background: 'transparent', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                🚪 {t('signOut')}
              </button>
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}
