'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

const Field = ({
  label, id, type = 'text', value, onChange, placeholder, hint,
}: {
  label: string; id: string; type?: string; value: string
  onChange: (v: string) => void; placeholder: string; hint?: string
}) => (
  <div style={{ marginBottom: 14 }}>
    <label htmlFor={id} style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>
      {label}
    </label>
    <input
      id={id} type={type} value={value} required autoComplete={id}
      onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, padding: '11px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
    />
    {hint && <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 4 }}>{hint}</div>}
  </div>
)

export default function RegisterPage() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Registration failed.'); return }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%,rgba(245,158,11,.04) 0%,transparent 60%),radial-gradient(ellipse at 70% 20%,rgba(59,130,246,.03) 0%,transparent 50%)' }} />

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 460, overflow: 'hidden', position: 'relative', zIndex: 1, boxShadow: '0 24px 80px rgba(0,0,0,.6)' }}>
        {/* Header */}
        <div style={{ padding: '28px 28px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
          <Logo />
          <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--amber)', marginBottom: 14, opacity: 0.9 }}>Forged for the field. Built for control.</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Create your workspace</div>
          <div style={{ fontSize: 12, color: 'var(--text4)' }}>Set up WorkForge for your business — free to start</div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
          {error && (
            <div role="alert" style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.22)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Step divider */}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            Company
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <Field id="companyName" label="Company Name" value={companyName} onChange={setCompanyName} placeholder="Acme Field Services" hint="This becomes your workspace name" />

          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 14, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            Your Account
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <Field id="name" label="Your Full Name" value={name} onChange={setName} placeholder="Alex Owner" />
          <Field id="email" label="Work Email" type="email" value={email} onChange={setEmail} placeholder="you@yourcompany.com" />
          <Field id="password" label="Password" type="password" value={password} onChange={setPassword} placeholder="Min. 8 characters" />
          <Field id="confirm" label="Confirm Password" type="password" value={confirm} onChange={setConfirm} placeholder="Repeat your password" />

          <button
            type="submit" disabled={loading}
            style={{ width: '100%', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, padding: 13, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: 4 }}
          >
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
