'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import PasswordStrength from '@/components/PasswordStrength'

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
    <div style={{ width: 44, height: 44, background: 'var(--amber)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg viewBox="-44 -44 88 88" style={{ width: 24, height: 24 }}>
        <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="#060a17" />
      </svg>
    </div>
    <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
      Work<span style={{ color: 'var(--amber)' }}>Forge</span>
    </span>
  </div>
)

const WarningIcon = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto 12px' }}>
    <path
      d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      fill="var(--red-dim)"
      stroke="var(--red)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <line x1="12" y1="9" x2="12" y2="13" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="17" r="1" fill="var(--red)" />
  </svg>
)

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--text4)',
  textTransform: 'uppercase',
  letterSpacing: '.8px',
  marginBottom: 7,
  fontFamily: 'var(--font-display)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--text)',
  fontSize: 14,
  padding: '12px 14px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

function InviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteInfo, setInviteInfo] = useState<{ email: string; company: string; role: string } | null>(null)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    if (!token) { setInvalid(true); return }
    fetch(`/api/invites/info?token=${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) setInvalid(true); else setInviteInfo(d) })
      .catch(() => setInvalid(true))
  }, [token])

  if (invalid) return (
    <div style={{ textAlign: 'center' }}>
      <WarningIcon />
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Invitation expired</div>
      <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.6 }}>
        This invite link is invalid or has expired. Ask your administrator to send a new one.
      </div>
    </div>
  )

  if (!inviteInfo) return (
    <div style={{ textAlign: 'center', color: 'var(--text4)', fontSize: 13 }}>Loading…</div>
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    const res = await fetch('/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        background: 'var(--bg3)',
        border: '1px solid var(--amber-border)',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 20,
        fontSize: 12,
      }}>
        <div style={{ color: 'var(--text4)', marginBottom: 2 }}>Joining as</div>
        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{inviteInfo.company}</div>
        <div style={{ color: 'var(--text4)', fontSize: 11, marginTop: 2 }}>
          {inviteInfo.email} · <span style={{ textTransform: 'capitalize' }}>{inviteInfo.role}</span>
        </div>
      </div>

      {error && (
        <div role="alert" style={{
          background: 'var(--red-dim)',
          border: '1px solid var(--red-border)',
          borderRadius: 10,
          padding: '12px 16px',
          fontSize: 13,
          color: 'var(--red)',
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label htmlFor="name" style={labelStyle}>Your Full Name</label>
        <input
          id="name"
          type="text"
          value={name}
          required
          autoFocus
          className="wf-auth-input"
          onChange={e => setName(e.target.value)}
          placeholder="Alex Smith"
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label htmlFor="password" style={labelStyle}>Password</label>
        <input
          id="password"
          type="password"
          value={password}
          required
          className="wf-auth-input"
          onChange={e => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          style={inputStyle}
        />
      </div>
      <PasswordStrength password={password} />

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="confirm" style={labelStyle}>Confirm Password</label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          required
          className="wf-auth-input"
          onChange={e => setConfirm(e.target.value)}
          placeholder="Repeat your password"
          style={inputStyle}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="wf-auth-btn"
        style={{
          width: '100%',
          background: 'var(--amber)',
          color: '#060a17',
          border: 'none',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 800,
          padding: 13,
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.6 : 1,
          fontFamily: 'var(--font-display)',
          transition: 'background 0.15s, transform 0.15s, opacity 0.15s',
        }}
      >
        {loading ? 'Setting up your account…' : 'Join Workspace →'}
      </button>
    </form>
  )
}

export default function InvitePage() {
  return (
    <>
      <style>{`
        .wf-auth-input:focus {
          border-color: var(--amber) !important;
          box-shadow: 0 0 0 3px rgba(245,158,11,.13);
          outline: none;
        }
        .wf-auth-btn:hover:not(:disabled) {
          background: var(--amber-hover) !important;
          transform: translateY(-1px);
        }
        .wf-auth-btn {
          transition: background 0.15s, transform 0.15s, opacity 0.15s;
        }
      `}</style>
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 25% 60%, rgba(245,158,11,.07) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          borderTop: '3px solid var(--amber)',
          width: '100%',
          maxWidth: 440,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
          boxShadow: 'var(--shadow-xl)',
        }}>
          <div style={{ padding: '24px 28px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
            <Logo />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 14, marginBottom: 4 }}>
              Accept your invitation
            </div>
            <div style={{ fontSize: 12, color: 'var(--text4)' }}>Create your account to get started</div>
          </div>
          <div style={{ padding: '24px 28px' }}>
            <Suspense fallback={null}><InviteContent /></Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
