'use client'

import { useState } from 'react'

const ROLE_COLOR: Record<string, string> = {
  superadmin: 'var(--purple)',
  admin:      'var(--amber)',
  dispatcher: 'var(--blue-light)',
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
  const [phone, setPhone]     = useState(user.phone ?? '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [hovered, setHovered] = useState(false)
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
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg2)',
        border: `1px solid ${hovered ? `color-mix(in srgb, ${rc} 30%, var(--border))` : 'var(--border)'}`,
        borderRadius: 16,
        overflow: 'hidden',
        opacity: user.active ? 1 : 0.5,
        transition: 'border-color 150ms, box-shadow 150ms, transform 150ms',
        boxShadow: hovered ? `0 8px 32px rgba(0,0,0,.45), 0 0 0 0px ${rc}` : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
        position: 'relative',
      }}
    >
      {/* Role accent stripe */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${rc}, color-mix(in srgb, ${rc} 40%, transparent))` }} />

      <div style={{ padding: '18px 18px 16px' }}>

        {/* Avatar + name row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          {/* Avatar */}
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: `color-mix(in srgb, ${rc} 16%, var(--bg3))`,
            border: `2px solid color-mix(in srgb, ${rc} 35%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: rc,
            letterSpacing: '-.5px', fontFamily: 'var(--font-display)',
          }}>
            {user.initials}
          </div>

          {/* Name + badges */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <div style={{
              fontSize: 15, fontWeight: 700, color: 'var(--text)',
              lineHeight: 1.2, marginBottom: 6,
              fontFamily: 'var(--font-display)', letterSpacing: '-.2px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              {/* Role badge */}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                background: `color-mix(in srgb, ${rc} 14%, transparent)`,
                color: rc,
                border: `1px solid color-mix(in srgb, ${rc} 30%, transparent)`,
                letterSpacing: '.3px', fontFamily: 'var(--font-body)',
              }}>
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
              {/* Active / inactive status */}
              {user.active ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--green)' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                  Active
                </span>
              ) : (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(239,68,68,.12)', color: 'var(--red)',
                  border: '1px solid rgba(239,68,68,.25)', letterSpacing: '.3px',
                }}>
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 7,
          padding: '12px 0 0', borderTop: '1px solid var(--border)',
        }}>
          {/* Email */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text4)', width: 14, textAlign: 'center', flexShrink: 0 }}>✉</span>
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontSize: 11, color: 'var(--text4)',
              fontFamily: 'var(--font-mono)',
            }}>
              {user.email}
            </span>
          </div>

          {/* Specialty */}
          {user.specialty && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text4)', width: 14, textAlign: 'center', flexShrink: 0 }}>⚙</span>
              <span style={{ fontSize: 11, color: 'var(--text4)' }}>{user.specialty}</span>
            </div>
          )}

          {/* Phone */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text4)', width: 14, textAlign: 'center', flexShrink: 0 }}>📞</span>
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
                    color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-mono)',
                  }}
                />
                <button onClick={savePhone} disabled={saving} style={{
                  fontSize: 10, padding: '4px 10px', borderRadius: 6,
                  background: 'var(--green)', color: '#060a17', border: 'none',
                  cursor: 'pointer', fontWeight: 700, flexShrink: 0, fontFamily: 'var(--font-body)',
                }}>
                  {saving ? '…' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} style={{
                  fontSize: 10, padding: '4px 8px', borderRadius: 6,
                  background: 'var(--bg4)', color: 'var(--text4)',
                  border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <span style={{
                  color: phone ? 'var(--text3)' : 'var(--text4)',
                  fontStyle: !phone ? 'italic' : 'normal',
                  fontSize: 11, fontFamily: phone ? 'var(--font-mono)' : 'var(--font-body)',
                }}>
                  {phone || 'No phone'}
                </span>
                {canEdit && (
                  <button onClick={() => setEditing(true)} style={{
                    fontSize: 9, padding: '2px 8px', borderRadius: 5,
                    background: 'var(--bg4)', color: 'var(--amber)',
                    border: '1px solid var(--amber-border)', cursor: 'pointer',
                    fontWeight: 700, marginLeft: 'auto', flexShrink: 0,
                    fontFamily: 'var(--font-body)',
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
