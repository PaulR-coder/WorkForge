'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const DEMO_ACCOUNTS = [
  { icon: '🏢', name: 'Alex Owner', role: 'Company Owner', email: 'owner@acmefield.com', password: 'owner123', badge: 'rb-admin', label: 'Admin' },
  { icon: '📋', name: 'Diana Dispatch', role: 'Dispatcher', email: 'dispatch@acmefield.com', password: 'disp123', badge: 'rb-dispatcher', label: 'Dispatcher' },
  { icon: '🔧', name: 'Carlos M.', role: 'HVAC Technician', email: 'carlos@acmefield.com', password: 'tech123', badge: 'rb-tech', label: 'Technician' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNeedsVerification(false)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.needsVerification) {
          setNeedsVerification(true)
          setResendEmail(data.email ?? email)
        } else {
          setError(data.error ?? 'Login failed')
        }
        return
      }
      const dest = data.role === 'tech' ? '/field' : '/dashboard'
      router.push(dest)
      router.refresh()
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResendStatus('sending')
    try {
      await fetch('/api/auth/resend-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      })
      setResendStatus('sent')
    } catch {
      setResendStatus('idle')
    }
  }

  function fillDemo(acc: typeof DEMO_ACCOUNTS[0]) {
    setEmail(acc.email)
    setPassword(acc.password)
    setError('')
    setNeedsVerification(false)
    setResendStatus('idle')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', overflowY: 'auto' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%,rgba(245,158,11,.04) 0%,transparent 60%),radial-gradient(ellipse at 70% 20%,rgba(59,130,246,.03) 0%,transparent 50%)' }} />

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 420, overflow: 'hidden', position: 'relative', zIndex: 1, animation: 'fadeIn .4s ease', boxShadow: '0 24px 80px rgba(0,0,0,.6)', margin: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '28px 28px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, background: 'var(--amber)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="-44 -44 88 88" style={{ width: 22, height: 22 }}>
                <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="#080c1a" />
              </svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>Work<span style={{ color: 'var(--text)' }}>Forge</span></span>
          </div>
          <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--amber)', marginBottom: 14, opacity: 0.9 }}>Forged for the field. Built for control.</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Sign in to your account</div>
          <div style={{ fontSize: 12, color: 'var(--text4)' }}>Secure field operations platform</div>
        </div>

        {/* Form */}
        <div style={{ padding: '24px 28px' }}>
          {needsVerification ? (
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Verify your email first</div>
              <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.6, marginBottom: 20 }}>
                We sent a verification link to <strong style={{ color: 'var(--text)' }}>{resendEmail}</strong>. Click the link in that email, then sign in.
              </div>
              {resendStatus === 'sent' ? (
                <div style={{ fontSize: 12, color: 'var(--green)', marginBottom: 16 }}>Verification email resent — check your inbox.</div>
              ) : (
                <button onClick={handleResend} disabled={resendStatus === 'sending'}
                  style={{ padding: '9px 18px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 12, fontWeight: 700, color: 'var(--text)', cursor: resendStatus === 'sending' ? 'wait' : 'pointer', marginBottom: 16 }}>
                  {resendStatus === 'sending' ? 'Sending…' : 'Resend verification email'}
                </button>
              )}
              <div>
                <button onClick={() => { setNeedsVerification(false); setResendStatus('idle') }}
                  style={{ background: 'none', border: 'none', color: 'var(--amber)', fontWeight: 700, fontSize: 12, cursor: 'pointer', textDecoration: 'none' }}>
                  ← Back to sign in
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              {error && (
                <div role="alert" style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.22)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--red)', marginBottom: 12, animation: 'shake .3s ease' }}>
                  {error}
                </div>
              )}
              <label htmlFor="login-email" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Email</label>
              <input id="login-email"
                type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                placeholder="your@email.com"
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, padding: '11px 14px', outline: 'none', marginBottom: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <label htmlFor="login-password" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Password</label>
                <Link href="/forgot-password" style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600, textDecoration: 'none' }}>Forgot password?</Link>
              </div>
              <input id="login-password"
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, padding: '11px 14px', outline: 'none', marginBottom: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <button type="submit" disabled={loading}
                style={{ width: '100%', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, padding: 13, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.5 : 1, marginBottom: 16 }}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text4)', marginBottom: 16, marginTop: 0 }}>
            New business?{' '}
            <Link href="/register" style={{ color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>Create a workspace →</Link>
          </p>

          {/* Demo accounts */}
          <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12, textAlign: 'center' }}>Demo Accounts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {DEMO_ACCOUNTS.map(acc => (
                <button key={acc.email} onClick={() => fillDemo(acc)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <div style={{ fontSize: 18, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg5)' }}>{acc.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{acc.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>{acc.role}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(245,158,11,.1)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,.22)' }}>{acc.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
