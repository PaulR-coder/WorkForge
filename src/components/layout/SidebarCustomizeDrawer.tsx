'use client'

import { useState } from 'react'

type NavItem = { href: string; labelKey: string; icon: React.ReactNode }
type NavGroup = { label: string; key: string; items: NavItem[] }

export default function SidebarCustomizeDrawer({
  groups,
  hiddenItems,
  onHiddenChange,
  onClose,
}: {
  groups: NavGroup[]
  hiddenItems: Set<string>
  onHiddenChange: (next: Set<string>) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState(new Set(hiddenItems))

  function toggle(href: string) {
    setLocal(prev => {
      const next = new Set(prev)
      if (next.has(href)) next.delete(href); else next.add(href)
      return next
    })
  }

  function save() {
    onHiddenChange(local)
    onClose()
  }

  function reset() {
    setLocal(new Set())
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(6,10,23,.5)', backdropFilter: 'blur(4px)', zIndex: 600 }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 320,
        background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
        zIndex: 601, display: 'flex', flexDirection: 'column',
        animation: 'slideInRight .2s var(--ease)',
        boxShadow: 'var(--shadow-xl)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Customize Sidebar</div>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>Toggle items to show or hide</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: 'var(--text4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {groups.map(group => (
            <div key={group.key} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '1.1px', marginBottom: 8 }}>
                {group.label}
              </div>
              {group.items.map(item => {
                const hidden = local.has(item.href)
                return (
                  <button
                    type="button"
                    key={item.href}
                    onClick={() => toggle(item.href)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)',
                      background: hidden ? 'transparent' : 'var(--bg3)',
                      cursor: 'pointer', marginBottom: 4, opacity: hidden ? 0.45 : 1,
                      transition: 'all 150ms',
                    }}
                  >
                    <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text2)', textAlign: 'left' }}>{item.labelKey}</span>
                    <div style={{
                      width: 36, height: 20, borderRadius: 99, flexShrink: 0,
                      background: hidden ? 'var(--bg4)' : 'var(--amber)',
                      border: `1px solid ${hidden ? 'var(--border2)' : 'var(--amber)'}`,
                      position: 'relative', transition: 'all 200ms',
                    }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%', background: 'white',
                        position: 'absolute', top: 2, transition: 'left 200ms',
                        left: hidden ? 2 : 18,
                      }} />
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button type="button" onClick={reset} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text3)' }}>
            Reset defaults
          </button>
          <button type="button" onClick={save} className="btn btn-primary" style={{ flex: 2 }}>
            Save changes
          </button>
        </div>
      </div>
    </>
  )
}
