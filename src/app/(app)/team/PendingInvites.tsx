'use client'

import { useState } from 'react'

type Invite = { id: string; email: string; role: string; createdAt: string; expiresAt: string }

const ROLE_COLORS: Record<string, string> = {
  admin: 'var(--amber)', dispatcher: 'var(--blue-light)', tech: 'var(--green)',
}

export default function PendingInvites({ initialInvites }: { initialInvites: Invite[] }) {
  const [invites, setInvites] = useState(initialInvites)
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
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>
        Pending Invites — {invites.length}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {invites.map(inv => {
          const expires = new Date(inv.expiresAt)
          const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 86400000)
          const roleColor = ROLE_COLORS[inv.role] ?? 'var(--text3)'
          const busy = revoking === inv.id
          return (
            <div key={inv.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 18 }}>✉️</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.email}</div>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>Expires in {daysLeft}d</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${roleColor}18`, color: roleColor, border: `1px solid ${roleColor}33`, flexShrink: 0 }}>
                {inv.role}
              </span>
              <button onClick={() => revoke(inv.id)} disabled={busy}
                style={{ padding: '5px 12px', background: 'transparent', color: 'var(--red)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1, flexShrink: 0 }}>
                {busy ? '…' : 'Revoke'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
