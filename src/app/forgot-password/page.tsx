'use client'

import { useState } from 'react'
import Link from 'next/link'

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
    <div style={{ width: 40, height: 40, background: 'var(--amber)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="-44 -44 88 88" style={{ width: 22, height: 22 }}>
        <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="#080c1a" />
      </svg>
    </div>
    <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>Work<span style={{ color: 'var(--text)' }}>Forge</span></span>
  </div>
)

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    setSent(true)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%,rgba(245,158,11,.04) 0%,transparent 60%)' }} />
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 420, overflow: 'hidden', position: 'relative', zIndex: 1, boxShadow: '0 24px 80px rgba(0,0,0,.6)' }}>
        <div style={{ padding: '28px 28px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
          <Logo />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Forgot your password?</div>
          <div style={{ fontSize: 12, color: 'var(--text4)' }}>Enter your email and we'll send you a reset link</div>
        </div>

        <div style={{ padding: '28px' }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📨</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Check your email</div>
              <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.6, marginBottom: 20 }}>
                If an account exists for <strong style={{ color: 'var(--text2)' }}>{email}</strong>, you'll receive a reset link within a few minutes.
              </div>
              <Link href="/login" style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>← Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label htmlFor="email" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>
                Email Address
              </label>
              <input
                id="email" type="email" value={email} required autoFocus
                onChange={e => setEmail(e.target.value)}
                placeholder="you@yourcompany.com"
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, padding: '11px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16 }}
              />
              <button type="submit" disabled={loading}
                style={{ width: '100%', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, padding: 13, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, marginBottom: 16 }}>
                {loading ? 'Sending…' : 'Send Reset Link →'}
              </button>
              <div style={{ textAlign: 'center' }}>
                <Link href="/login" style={{ fontSize: 12, color: 'var(--text4)', textDecoration: 'none' }}>← Back to sign in</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
