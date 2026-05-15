'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PasswordStrength from '@/components/PasswordStrength'

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

  const inputStyle = { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, padding: '11px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block' as const, fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase' as const, letterSpacing: '.5px', marginBottom: 5 }
  const divider = (text: string) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 14, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      {text}
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%,rgba(245,158,11,.04) 0%,transparent 60%),radial-gradient(ellipse at 70% 20%,rgba(59,130,246,.03) 0%,transparent 50%)' }} />

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 460, overflow: 'hidden', position: 'relative', zIndex: 1, boxShadow: '0 24px 80px rgba(0,0,0,.6)', margin: 'auto' }}>
        <div style={{ padding: '28px 28px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
          <Logo />
          <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--amber)', marginBottom: 14, opacity: 0.9 }}>Forged for the field. Built for control.</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Create your workspace</div>
          <div style={{ fontSize: 12, color: 'var(--text4)' }}>Set up WorkForge for your business — free to start</div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
          {error && (
            <div role="alert" style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.22)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {divider('Company')}
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="companyName" style={labelStyle}>Company Name</label>
            <input id="companyName" type="text" value={companyName} required autoFocus
              onChange={e => setCompanyName(e.target.value)} placeholder="Acme Field Services"
              style={inputStyle} />
            <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 4 }}>This becomes your workspace name</div>
          </div>

          {divider('Your Account')}
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="name" style={labelStyle}>Your Full Name</label>
            <input id="name" type="text" value={name} required onChange={e => setName(e.target.value)} placeholder="Alex Owner" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="email" style={labelStyle}>Work Email</label>
            <input id="email" type="email" value={email} required onChange={e => setEmail(e.target.value)} placeholder="you@yourcompany.com" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input id="password" type="password" value={password} required onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" style={inputStyle} />
          </div>
          <PasswordStrength password={password} />
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="confirm" style={labelStyle}>Confirm Password</label>
            <input id="confirm" type="password" value={confirm} required onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" style={inputStyle} />
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 20, fontSize: 12, color: 'var(--text4)', lineHeight: 1.5 }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: 2, accentColor: 'var(--amber)', flexShrink: 0 }} />
            <span>
              I agree to the{' '}
              <Link href="/terms" target="_blank" style={{ color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" style={{ color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>Privacy Policy</Link>
            </span>
          </label>

          <button type="submit" disabled={loading || !agreed}
            style={{ width: '100%', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, padding: 13, cursor: (loading || !agreed) ? 'not-allowed' : 'pointer', opacity: (loading || !agreed) ? 0.5 : 1 }}>
            {loading ? 'Creating workspace…' : 'Create Workspace →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text4)', marginTop: 16, marginBottom: 0 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
