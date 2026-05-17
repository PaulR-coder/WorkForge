'use client'

import { useState } from 'react'

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access, manages team and jobs' },
  { value: 'dispatcher', label: 'Dispatcher', desc: 'Creates and assigns jobs' },
  { value: 'tech', label: 'Technician', desc: 'Views and completes assigned jobs' },
  { value: 'readonly', label: 'Read-only', desc: 'View-only access' },
]

export default function InviteButton() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('tech')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  function reset() {
    setEmail('')
    setRole('tech')
    setError('')
    setSent(false)
    setOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to send invite.'); return }
    setSent(true)
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
        + Invite Member
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Invite team member"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) reset() }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 'min(420px, 90vw)', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.7)' }}>
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Invite Team Member</div>
              <button onClick={reset} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text4)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
            </div>

            <div style={{ padding: '20px' }}>
              {sent ? (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>✉️</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Invite sent!</div>
                  <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 20 }}>{email} will receive an email with a link to join your workspace.</div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button onClick={() => { setSent(false); setEmail(''); setError('') }}
                      style={{ padding: '8px 16px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'var(--text)', cursor: 'pointer' }}>
                      Invite Another
                    </button>
                    <button onClick={reset}
                      style={{ padding: '8px 16px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {error && <div role="alert" style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.22)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}

                  <label htmlFor="invite-email" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Email Address</label>
                  <input id="invite-email" type="email" value={email} required autoFocus
                    onChange={e => setEmail(e.target.value)} placeholder="teammate@company.com"
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text)', fontSize: 13, padding: '10px 13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16 }}
                  />

                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Role</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                    {ROLES.map(r => (
                      <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: role === r.value ? 'rgba(245,158,11,.08)' : 'var(--bg3)', border: `1px solid ${role === r.value ? 'rgba(245,158,11,.4)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer' }}>
                        <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} style={{ accentColor: 'var(--amber)' }} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{r.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text4)' }}>{r.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <button type="submit" disabled={loading}
                    style={{ width: '100%', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, padding: '11px 0', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                    {loading ? 'Sending…' : 'Send Invitation →'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
