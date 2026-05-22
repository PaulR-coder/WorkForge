'use client'

import { useState } from 'react'

const ROLES = [
  {
    value: 'admin',
    label: 'Admin',
    desc: 'Full access — manages team, jobs, and settings',
    icon: '◆',
    color: 'var(--amber)',
    bg: 'rgba(245,158,11,.08)',
    border: 'rgba(245,158,11,.35)',
  },
  {
    value: 'dispatcher',
    label: 'Dispatcher',
    desc: 'Creates and assigns work orders to technicians',
    icon: '◈',
    color: 'var(--blue-light)',
    bg: 'rgba(91,163,245,.08)',
    border: 'rgba(91,163,245,.35)',
  },
  {
    value: 'tech',
    label: 'Technician',
    desc: 'Views and completes their assigned jobs in the field',
    icon: '◉',
    color: 'var(--green)',
    bg: 'rgba(34,197,94,.08)',
    border: 'rgba(34,197,94,.35)',
  },
]

export default function InviteButton() {
  const [open, setOpen]       = useState(false)
  const [email, setEmail]     = useState('')
  const [role, setRole]       = useState('tech')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [sent, setSent]       = useState(false)

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
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 18px',
          background: 'var(--amber)',
          color: '#060a17',
          border: 'none', borderRadius: 10,
          fontSize: 13, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'var(--font-display)', letterSpacing: '.3px',
          boxShadow: '0 4px 16px rgba(245,158,11,.3)',
          transition: 'opacity 150ms',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
        Invite Member
      </button>

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Invite team member"
          onClick={e => { if (e.target === e.currentTarget) reset() }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 16,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderTop: '3px solid var(--amber)',
            borderRadius: 18,
            width: '100%', maxWidth: 'min(440px, 92vw)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xl)',
          }}>
            {/* Header */}
            <div style={{
              padding: '22px 24px 18px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{
                  fontSize: 18, fontWeight: 700, color: 'var(--text)',
                  fontFamily: 'var(--font-display)', letterSpacing: '-.2px',
                }}>
                  Invite Team Member
                </div>
                <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2, fontFamily: 'var(--font-body)' }}>
                  They'll receive an email with a sign-up link
                </div>
              </div>
              <button
                onClick={reset}
                aria-label="Close"
                style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  color: 'var(--text4)', cursor: 'pointer',
                  fontSize: 14, lineHeight: 1, padding: '6px 8px',
                  borderRadius: 8,
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              {sent ? (
                /* Success state */
                <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'rgba(34,197,94,.12)', border: '2px solid rgba(34,197,94,.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, margin: '0 auto 16px',
                  }}>
                    ✓
                  </div>
                  <div style={{
                    fontSize: 17, fontWeight: 700, color: 'var(--text)',
                    marginBottom: 8, fontFamily: 'var(--font-display)',
                  }}>
                    Invite Sent!
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text4)', marginBottom: 24, lineHeight: 1.5 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>{email}</span>
                    {' '}will receive a link to join your workspace.
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                      onClick={() => { setSent(false); setEmail(''); setError('') }}
                      style={{
                        padding: '9px 18px', background: 'var(--bg3)',
                        border: '1px solid var(--border)', borderRadius: 9,
                        fontSize: 13, fontWeight: 700, color: 'var(--text)',
                        cursor: 'pointer', fontFamily: 'var(--font-body)',
                      }}
                    >
                      Invite Another
                    </button>
                    <button
                      onClick={reset}
                      style={{
                        padding: '9px 18px', background: 'var(--amber)',
                        color: '#060a17', border: 'none', borderRadius: 9,
                        fontSize: 13, fontWeight: 800, cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Error */}
                  {error && (
                    <div
                      role="alert"
                      style={{
                        background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)',
                        borderRadius: 9, padding: '10px 13px', fontSize: 12,
                        color: 'var(--red)', marginBottom: 18,
                      }}
                    >
                      {error}
                    </div>
                  )}

                  {/* Email input */}
                  <label
                    htmlFor="invite-email"
                    style={{
                      display: 'block', fontSize: 11, fontWeight: 700,
                      color: 'var(--text4)', textTransform: 'uppercase',
                      letterSpacing: '.6px', marginBottom: 6,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    value={email}
                    required
                    autoFocus
                    onChange={e => setEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    style={{
                      width: '100%', background: 'var(--bg3)',
                      border: '1px solid var(--border)', borderRadius: 10,
                      color: 'var(--text)', fontSize: 13,
                      padding: '11px 14px', outline: 'none',
                      fontFamily: 'var(--font-mono)',
                      boxSizing: 'border-box', marginBottom: 20,
                      transition: 'border-color 150ms',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--amber)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />

                  {/* Role selector */}
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--text4)',
                    textTransform: 'uppercase', letterSpacing: '.6px',
                    marginBottom: 10, fontFamily: 'var(--font-body)',
                  }}>
                    Role
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 22 }}>
                    {ROLES.map(r => {
                      const selected = role === r.value
                      return (
                        <label
                          key={r.value}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 14px',
                            background: selected ? r.bg : 'var(--bg3)',
                            border: `1px solid ${selected ? r.border : 'var(--border)'}`,
                            borderRadius: 10, cursor: 'pointer',
                            transition: 'background 120ms, border-color 120ms',
                          }}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={r.value}
                            checked={selected}
                            onChange={() => setRole(r.value)}
                            style={{ accentColor: r.color, width: 15, height: 15, flexShrink: 0 }}
                          />
                          {/* Role icon bubble */}
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: selected ? `color-mix(in srgb, ${r.color} 18%, transparent)` : 'var(--bg4)',
                            border: `1px solid ${selected ? r.border : 'var(--border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, color: selected ? r.color : 'var(--text4)',
                            transition: 'all 120ms',
                          }}>
                            {r.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 700,
                              color: selected ? r.color : 'var(--text)',
                              marginBottom: 2, fontFamily: 'var(--font-body)',
                            }}>
                              {r.label}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text4)', fontFamily: 'var(--font-body)' }}>
                              {r.desc}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%', background: 'var(--amber)',
                      color: '#060a17', border: 'none', borderRadius: 10,
                      fontSize: 14, fontWeight: 800,
                      padding: '12px 0', cursor: loading ? 'wait' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      fontFamily: 'var(--font-display)', letterSpacing: '.5px',
                      boxShadow: loading ? 'none' : '0 4px 16px rgba(245,158,11,.25)',
                    }}
                  >
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
