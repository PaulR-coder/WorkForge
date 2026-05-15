'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { SessionUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { useState, useEffect } from 'react'
import { useLang } from '@/components/LangProvider'
import { useIsMobile } from '@/lib/useIsMobile'
import type { TKeys } from '@/lib/i18n'

const NAV_ITEMS: { href: string; icon: string; labelKey: TKeys; perm: string | null }[] = [
  { href: '/dashboard', icon: '📊', labelKey: 'dashboard', perm: 'viewDashboard' },
  { href: '/jobs', icon: '🔧', labelKey: 'workOrders', perm: null },
  { href: '/field', icon: '📱', labelKey: 'fieldView', perm: null },
  { href: '/invoices', icon: '💰', labelKey: 'invoices', perm: 'viewFinancials' },
  { href: '/payments', icon: '💳', labelKey: 'payments', perm: 'viewFinancials' },
  { href: '/equipment', icon: '⚙', labelKey: 'equipment', perm: 'viewEquipment' },
  { href: '/contracts', icon: '📑', labelKey: 'contracts', perm: 'viewContracts' },
  { href: '/team', icon: '👥', labelKey: 'team', perm: 'manageSettings' },
  { href: '/audit', icon: '🛡', labelKey: 'auditLog', perm: 'viewAudit' },
]

export default function AppShell({ session, children }: { session: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { lang, setLang, t } = useLang()
  const isMobile = useIsMobile()

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  const visibleNav = NAV_ITEMS.filter(item => {
    if (!item.perm) return true
    return can(session.role, item.perm)
  })

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

        {/* Hamburger - mobile only */}
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

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar - desktop only */}
        {!isMobile && (
          <nav style={{ width: 200, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
            <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {visibleNav.map(item => navLink(item))}
            </div>
            <div style={{ marginTop: 'auto', padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
              <div style={{ padding: '8px 12px', fontSize: 10, color: 'var(--text4)' }}>
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

      {/* Mobile nav overlay */}
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
