'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PasswordStrength from '@/components/PasswordStrength'

const Logo = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
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
  </div>
)

export default function RegisterPage() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (!agreed) { setError('Please accept the Terms of Service to continue.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Registration failed.'); return }
      router.push(`/verify?email=${encodeURIComponent(email)}`)
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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

  const divider = (text: string) => (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      color: 'var(--amber)',
      textTransform: 'uppercase',
      letterSpacing: '.8px',
      marginBottom: 14,
      marginTop: 4,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--font-display)',
    }}>
      <span style={{ flex: 1, height: 1, background: 'var(--amber-border)' }} />
      {text}
      <span style={{ flex: 1, height: 1, background: 'var(--amber-border)' }} />
    </div>
  )

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
        overflowY: 'auto',
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
          maxWidth: 460,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
          boxShadow: 'var(--shadow-xl)',
          margin: 'auto',
        }}>
          <div style={{ padding: '24px 28px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
            <Logo />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 14, marginBottom: 4 }}>
              Create your workspace
            </div>
            <div style={{ fontSize: 12, color: 'var(--text4)' }}>
              Set up WorkForge for your business — free to start
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
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

            {divider('Company')}
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="companyName" style={labelStyle}>Company Name</label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                required
                autoFocus
                className="wf-auth-input"
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Acme Field Services"
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
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />
              <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 4 }}>This becomes your workspace name</div>
            </div>

            {divider('Your Account')}
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="name" style={labelStyle}>Your Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                required
                className="wf-auth-input"
                onChange={e => setName(e.target.value)}
                placeholder="Alex Owner"
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
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="email" style={labelStyle}>Work Email</label>
              <input
                id="email"
                type="email"
                value={email}
                required
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
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
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
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />
            </div>
            <PasswordStrength password={password} />
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="confirm" style={labelStyle}>Confirm Password</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                required
                className="wf-auth-input"
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
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
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />
            </div>

            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              cursor: 'pointer',
              marginBottom: 20,
              fontSize: 12,
              color: 'var(--text4)',
              lineHeight: 1.5,
            }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: 2, accentColor: 'var(--amber)', flexShrink: 0 }}
              />
              <span>
                I agree to the{' '}
                <Link href="/terms" target="_blank" style={{ color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" style={{ color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>
                  Privacy Policy
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !agreed}
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
                cursor: (loading || !agreed) ? 'not-allowed' : 'pointer',
                opacity: (loading || !agreed) ? 0.5 : 1,
                fontFamily: 'var(--font-display)',
              }}
            >
              {loading ? 'Creating workspace…' : 'Create Workspace →'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text4)', marginTop: 16, marginBottom: 0 }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  )
}
