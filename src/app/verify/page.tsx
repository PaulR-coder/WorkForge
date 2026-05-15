'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

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

function VerifyContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  async function resend() {
    if (!email) return
    setResending(true)
    await fetch('/api/auth/resend-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setResending(false)
    setResent(true)
  }

  if (token) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Verifying your email…</div>
        <div style={{ fontSize: 12, color: 'var(--text4)' }}>You should be redirected automatically.</div>
        <script dangerouslySetInnerHTML={{ __html: `window.location.href='/api/auth/verify?token=${token}'` }} />
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Check your inbox</div>
      <div style={{ fontSize: 13, color: 'var(--text4)', lineHeight: 1.6, marginBottom: 24 }}>
        We sent a verification link to <strong style={{ color: 'var(--text2)' }}>{email ?? 'your email'}</strong>.
        Click the link to activate your workspace.
      </div>

      {resent ? (
        <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, marginBottom: 16 }}>✓ Verification email resent</div>
      ) : (
        <button onClick={resend} disabled={resending || !email}
          style={{ fontSize: 12, color: 'var(--amber)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, marginBottom: 16, padding: 0 }}>
          {resending ? 'Sending…' : "Didn't get it? Resend email"}
        </button>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <Link href="/login" style={{ fontSize: 12, color: 'var(--text4)', textDecoration: 'none' }}>
          ← Back to sign in
        </Link>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%,rgba(245,158,11,.04) 0%,transparent 60%)' }} />
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 420, overflow: 'hidden', position: 'relative', zIndex: 1, boxShadow: '0 24px 80px rgba(0,0,0,.6)' }}>
        <div style={{ padding: '28px 28px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
          <Logo />
        </div>
        <div style={{ padding: '32px 28px' }}>
          <Suspense fallback={<div style={{ textAlign: 'center', color: 'var(--text4)' }}>Loading…</div>}>
            <VerifyContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
