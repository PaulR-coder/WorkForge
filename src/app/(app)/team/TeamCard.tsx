'use client'

import { useState } from 'react'

const ROLE_COLOR: Record<string, string> = {
  superadmin: 'var(--purple)',
  admin:      'var(--amber)',
  dispatcher: '#5ba3f5',
  tech:       'var(--green)',
  readonly:   'var(--text4)',
}

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin',
  admin:      'Admin',
  dispatcher: 'Dispatcher',
  tech:       'Technician',
  readonly:   'Read-only',
}

type User = {
  id: string; name: string; email: string; phone: string | null
  role: string; initials: string; company: string; specialty: string; active: boolean
}

export default function TeamCard({ user, canEdit }: { user: User; canEdit: boolean }) {
  const [phone, setPhone]   = useState(user.phone ?? '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const rc = ROLE_COLOR[user.role] ?? 'var(--text3)'

  async function savePhone() {
    setSaving(true)
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    setSaving(false)
    setEditing(false)
  }

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden',
      opacity: user.active ? 1 : .55,
      transition: 'box-shadow 150ms, transform 150ms',
      position: 'relative',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'none'
      }}
    >
      {/* Role accent stripe */}
      <div style={{ height: 3, background: rc, opacity: .7 }} />

      <div style={{ padding: '16px 16px 14px' }}>
        {/* Avatar + name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: `${rc}20`, border: `2px solid ${rc}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: rc, letterSpacing: '-.5px',
          }}>
            {user.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, marginBottom: 3 }}>
              {user.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                background: `${rc}18`, color: rc, border: `1px solid ${rc}30`,
                letterSpacing: '.3px',
              }}>
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
              {!user.active && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red-border)',
                  letterSpacing: '.3px',
                }}>
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text3)' }}>
            <span style={{ fontSize: 12, width: 14, textAlign: 'center' }}>✉</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text4)' }}>
              {user.email}
            </span>
          </div>

          {user.specialty && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text3)' }}>
              <span style={{ fontSize: 12, width: 14, textAlign: 'center' }}>⚙</span>
              <span style={{ color: 'var(--text4)' }}>{user.specialty}</span>
            </div>
          )}

          {/* Phone */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 12, width: 14, textAlign: 'center', color: 'var(--text3)' }}>📞</span>
            {editing ? (
              <div style={{ display: 'flex', gap: 5, flex: 1, alignItems: 'center' }}>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') savePhone(); if (e.key === 'Escape') setEditing(false) }}
                  style={{
                    flex: 1, fontSize: 11, padding: '5px 8px', borderRadius: 7,
                    border: '1px solid var(--amber)', background: 'var(--bg3)',
                    color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button onClick={savePhone} disabled={saving} style={{
                  fontSize: 10, padding: '4px 10px', borderRadius: 6,
                  background: 'var(--green)', color: '#060a17', border: 'none',
                  cursor: 'pointer', fontWeight: 700, flexShrink: 0,
                }}>
                  {saving ? '…' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} style={{
                  fontSize: 10, padding: '4px 8px', borderRadius: 6,
                  background: 'var(--bg4)', color: 'var(--text4)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                }}>
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <span style={{ color: phone ? 'var(--text3)' : 'var(--text4)', fontStyle: !phone ? 'italic' : 'normal' }}>
                  {phone || 'No phone'}
                </span>
                {canEdit && (
                  <button onClick={() => setEditing(true)} style={{
                    fontSize: 9, padding: '2px 8px', borderRadius: 5,
                    background: 'var(--bg4)', color: 'var(--amber)',
                    border: '1px solid var(--amber-border)', cursor: 'pointer',
                    fontWeight: 700, marginLeft: 'auto', flexShrink: 0,
                  }}>
                    {phone ? 'Edit' : '+ Add'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
