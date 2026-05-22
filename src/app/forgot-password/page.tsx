'use client'

import { useState } from 'react'
import Link from 'next/link'

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

const EnvelopeIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 16, display: 'block', margin: '0 auto 16px' }}>
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="var(--amber)" strokeWidth="1.5" fill="var(--amber-dim)" />
    <path d="M2 7L12 13L22 7" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
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
              Forgot your password?
            </div>
            <div style={{ fontSize: 12, color: 'var(--text4)' }}>
              Enter your email and we&apos;ll send you a reset link
            </div>
          </div>

          <div style={{ padding: '24px 28px' }}>
            {sent ? (
              <div style={{ textAlign: 'center' }}>
                <EnvelopeIcon />
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  Check your email
                </div>
                <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.6, marginBottom: 20 }}>
                  If an account exists for{' '}
                  <strong style={{ color: 'var(--text2)' }}>{email}</strong>, you&apos;ll receive a reset link within a few minutes.
                </div>
                <Link
                  href="/login"
                  style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}
                >
                  ← Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--text4)',
                    textTransform: 'uppercase',
                    letterSpacing: '.8px',
                    marginBottom: 7,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  required
                  autoFocus
                  className="wf-auth-input"
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@yourcompany.com"
                  style={{
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
                    marginBottom: 16,
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
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
                    marginBottom: 16,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {loading ? 'Sending…' : 'Send Reset Link →'}
                </button>
                <div style={{ textAlign: 'center' }}>
                  <Link
                    href="/login"
                    style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}
                  >
                    ← Back to sign in
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
