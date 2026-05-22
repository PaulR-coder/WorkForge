'use client'

import { useState } from 'react'

type Invite = { id: string; email: string; role: string; createdAt: string; expiresAt: string }

const ROLE_COLORS: Record<string, string> = {
  admin:      'var(--amber)',
  dispatcher: 'var(--blue-light)',
  tech:       'var(--green)',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', dispatcher: 'Dispatcher', tech: 'Technician',
}

export default function PendingInvites({ initialInvites }: { initialInvites: Invite[] }) {
  const [invites, setInvites]   = useState(initialInvites)
  const [revoking, setRevoking] = useState<string | null>(null)

  async function revoke(id: string) {
    setRevoking(id)
    const res = await fetch('/api/invites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setRevoking(null)
    if (res.ok) setInvites(prev => prev.filter(i => i.id !== id))
  }

  if (invites.length === 0) return null

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--bg3)',
      }}>
        <span style={{ fontSize: 13, opacity: 0.7 }}>✉</span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: '.7px',
          fontFamily: 'var(--font-display)',
        }}>
          Pending Invites
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
          background: 'rgba(245,158,11,.12)', color: 'var(--amber)',
          border: '1px solid rgba(245,158,11,.28)',
        }}>
          {invites.length}
        </span>
      </div>

      {/* Invite rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {invites.map((inv, idx) => {
          const expires  = new Date(inv.expiresAt)
          const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 86400000)
          const roleColor = ROLE_COLORS[inv.role] ?? 'var(--text3)'
          const busy      = revoking === inv.id
          const isLast    = idx === invites.length - 1

          return (
            <div
              key={inv.id}
              style={{
                padding: '13px 18px',
                display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: isLast ? 'none' : '1px solid var(--border)',
              }}
            >
              {/* Envelope icon with role color */}
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: `color-mix(in srgb, ${roleColor} 12%, var(--bg3))`,
                border: `1px solid color-mix(in srgb, ${roleColor} 25%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: roleColor,
              }}>
                ✉
              </div>

              {/* Email + expiry */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-mono)', marginBottom: 2,
                }}>
                  {inv.email}
                </div>
                <div style={{ fontSize: 11, color: daysLeft <= 2 ? 'var(--amber)' : 'var(--text4)' }}>
                  Expires in {daysLeft}d
                </div>
              </div>

              {/* Role badge */}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                background: `color-mix(in srgb, ${roleColor} 12%, transparent)`,
                color: roleColor,
                border: `1px solid color-mix(in srgb, ${roleColor} 28%, transparent)`,
                flexShrink: 0, letterSpacing: '.2px',
                fontFamily: 'var(--font-body)',
              }}>
                {ROLE_LABELS[inv.role] ?? inv.role}
              </span>

              {/* Revoke */}
              <button
                onClick={() => revoke(inv.id)}
                disabled={busy}
                style={{
                  padding: '5px 12px',
                  background: 'transparent',
                  color: 'var(--red)',
                  border: '1px solid rgba(239,68,68,.28)',
                  borderRadius: 7, fontSize: 11, fontWeight: 600,
                  cursor: busy ? 'wait' : 'pointer',
                  opacity: busy ? 0.6 : 1,
                  flexShrink: 0,
                  transition: 'background 120ms',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {busy ? '…' : 'Revoke'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
