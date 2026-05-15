'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Invitation expired</div>
      <div style={{ fontSize: 12, color: 'var(--text4)' }}>This invite link is invalid or has expired. Ask your administrator to send a new one.</div>
    </div>
  )

  if (!inviteInfo) return <div style={{ textAlign: 'center', color: 'var(--text4)', fontSize: 13 }}>Loading…</div>

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
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: 12 }}>
        <div style={{ color: 'var(--text4)', marginBottom: 2 }}>Joining as</div>
        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{inviteInfo.company}</div>
        <div style={{ color: 'var(--text4)', fontSize: 11, marginTop: 2 }}>{inviteInfo.email} · <span style={{ textTransform: 'capitalize' }}>{inviteInfo.role}</span></div>
      </div>

      {error && <div role="alert" style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.22)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>{error}</div>}

      {[
        { id: 'name', label: 'Your Full Name', type: 'text', value: name, set: setName, placeholder: 'Alex Smith' },
      ].map(f => (
        <div key={f.id} style={{ marginBottom: 14 }}>
          <label htmlFor={f.id} style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{f.label}</label>
          <input id={f.id} type={f.type} value={f.value} required autoFocus
            onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
            style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, padding: '11px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>
      ))}

      <div style={{ marginBottom: 8 }}>
        <label htmlFor="password" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Password</label>
        <input id="password" type="password" value={password} required
          onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
          style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, padding: '11px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>
      <PasswordStrength password={password} />

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="confirm" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Confirm Password</label>
        <input id="confirm" type="password" value={confirm} required
          onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password"
          style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, padding: '11px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>

      <button type="submit" disabled={loading}
        style={{ width: '100%', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, padding: 13, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1 }}>
        {loading ? 'Setting up your account…' : 'Join Workspace →'}
      </button>
    </form>
  )
}

export default function InvitePage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%,rgba(245,158,11,.04) 0%,transparent 60%)' }} />
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 440, overflow: 'hidden', position: 'relative', zIndex: 1, boxShadow: '0 24px 80px rgba(0,0,0,.6)' }}>
        <div style={{ padding: '28px 28px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
          <Logo />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Accept your invitation</div>
          <div style={{ fontSize: 12, color: 'var(--text4)' }}>Create your account to get started</div>
        </div>
        <div style={{ padding: '24px 28px' }}>
          <Suspense fallback={null}><InviteContent /></Suspense>
        </div>
      </div>
    </div>
  )
}
