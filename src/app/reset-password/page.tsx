'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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

const CheckIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto 12px' }}>
    <circle cx="12" cy="12" r="10" fill="var(--green-dim)" stroke="var(--green)" strokeWidth="1.5" />
    <path d="M7.5 12L10.5 15L16.5 9" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function ResetContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>Invalid reset link.</div>
      <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>
        Request a new one →
      </Link>
    </div>
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  if (done) return (
    <div style={{ textAlign: 'center' }}>
      <CheckIcon />
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Password updated</div>
      <div style={{ fontSize: 12, color: 'var(--text4)' }}>Redirecting you to sign in…</div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
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
      <label htmlFor="password" style={labelStyle}>New Password</label>
      <input
        id="password"
        type="password"
        value={password}
        required
        autoFocus
        className="wf-auth-input"
        onChange={e => setPassword(e.target.value)}
        placeholder="Min. 8 characters"
        style={{ ...inputStyle, marginBottom: 8 }}
      />
      <PasswordStrength password={password} />
      <label htmlFor="confirm" style={labelStyle}>Confirm Password</label>
      <input
        id="confirm"
        type="password"
        value={confirm}
        required
        className="wf-auth-input"
        onChange={e => setConfirm(e.target.value)}
        placeholder="Repeat your password"
        style={{ ...inputStyle, marginBottom: 16 }}
      />
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
        {loading ? 'Saving…' : 'Set New Password →'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
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
          maxWidth: 420,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
          boxShadow: 'var(--shadow-xl)',
        }}>
          <div style={{ padding: '24px 28px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
            <Logo />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 14, marginBottom: 4 }}>
              Set a new password
            </div>
            <div style={{ fontSize: 12, color: 'var(--text4)' }}>Choose something strong and unique</div>
          </div>
          <div style={{ padding: '24px 28px' }}>
            <Suspense fallback={null}><ResetContent /></Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
