'use client'

import { useState } from 'react'

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'var(--purple)',
  admin: 'var(--amber)',
  dispatcher: '#5ba3f5',
  tech: 'var(--green)',
}

type User = {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  initials: string
  company: string
  specialty: string
  active: boolean
}

export default function TeamCard({ user, canEdit }: { user: User; canEdit: boolean }) {
  const [phone, setPhone] = useState(user.phone ?? '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const rc = ROLE_COLORS[user.role] ?? 'var(--text3)'

  async function savePhone() {
    setSaving(true)
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    setSaving(false)
    setEditing(false)
  }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, opacity: user.active ? 1 : 0.5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: rc, color: '#080c1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
          {user.initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{user.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text4)' }}>{user.specialty || user.company}</div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${rc}18`, color: rc, border: `1px solid ${rc}33`, textTransform: 'capitalize' }}>
          {user.role}
        </span>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 6 }}>{user.email}</div>

      {editing ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+1 555 000 0000"
            style={{ flex: 1, fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
            onKeyDown={e => { if (e.key === 'Enter') savePhone(); if (e.key === 'Escape') setEditing(false) }}
            autoFocus
          />
          <button onClick={savePhone} disabled={saving} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, background: 'var(--green)', color: '#080c1a', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, background: 'var(--bg3)', color: 'var(--text4)', border: 'none', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: phone ? 'var(--text3)' : 'var(--text5)' }}>
            {phone || (canEdit ? 'No phone' : '')}
          </span>
          {canEdit && (
            <button onClick={() => setEditing(true)} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 5, background: 'var(--bg3)', color: 'var(--text4)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              {phone ? 'Edit' : '+ Phone'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
