'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto 16px' }}>
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="var(--amber)" strokeWidth="1.5" fill="var(--amber-dim)" />
    <path d="M2 7L12 13L22 7" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const WarningIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto 16px' }}>
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

const AmberSpinner = () => (
  <>
    <style>{`
      @keyframes wf-spin {
        to { transform: rotate(360deg); }
      }
      .wf-spinner {
        width: 48px;
        height: 48px;
        border: 3px solid rgba(245,158,11,.2);
        border-top-color: var(--amber);
        border-radius: 50%;
        animation: wf-spin 0.8s linear infinite;
        margin: 0 auto 16px;
      }
    `}</style>
    <div className="wf-spinner" />
  </>
)

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`)
      .then(async res => {
        const data = await res.json()
        if (res.ok) {
          router.push('/dashboard')
          router.refresh()
        } else {
          setVerifyError(data.error ?? 'Verification failed. The link may have expired.')
        }
      })
      .catch(() => setVerifyError('Connection error. Please try again.'))
  }, [token, router])

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
    if (verifyError) {
      return (
        <div style={{ textAlign: 'center' }}>
          <WarningIcon />
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Verification failed</div>
          <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.6, marginBottom: 20 }}>{verifyError}</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/register"
              style={{
                padding: '9px 16px',
                background: 'var(--amber)',
                color: '#060a17',
                borderRadius: 9,
                fontSize: 12,
                fontWeight: 800,
                textDecoration: 'none',
                display: 'inline-block',
                fontFamily: 'var(--font-display)',
              }}
            >
              Register again →
            </Link>
            <Link
              href="/login"
              style={{
                padding: '9px 16px',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: 9,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Back to sign in
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div style={{ textAlign: 'center' }}>
        <AmberSpinner />
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Verifying your email…</div>
        <div style={{ fontSize: 12, color: 'var(--text4)' }}>You will be redirected automatically.</div>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <EnvelopeIcon />
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Check your inbox</div>
      <div style={{ fontSize: 13, color: 'var(--text4)', lineHeight: 1.6, marginBottom: 24 }}>
        We sent a verification link to{' '}
        <strong style={{ color: 'var(--text2)' }}>{email ?? 'your email'}</strong>.
        Click the link to activate your workspace.
      </div>

      {resent ? (
        <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, marginBottom: 16 }}>
          &#10003; Verification email resent
        </div>
      ) : (
        <button
          onClick={resend}
          disabled={resending || !email}
          style={{
            fontSize: 12,
            color: 'var(--amber)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            marginBottom: 16,
            padding: 0,
          }}
        >
          {resending ? 'Sending…' : "Didn't get it? Resend email"}
        </button>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <Link href="/login" style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700, textDecoration: 'none' }}>
          ← Back to sign in
        </Link>
      </div>
    </div>
  )
}

export default function VerifyPage() {
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
        @keyframes wf-spin {
          to { transform: rotate(360deg); }
        }
        .wf-spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(245,158,11,.2);
          border-top-color: var(--amber);
          border-radius: 50%;
          animation: wf-spin 0.8s linear infinite;
          margin: 0 auto 16px;
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
              Verify your email
            </div>
            <div style={{ fontSize: 12, color: 'var(--text4)' }}>
              One more step to activate your workspace
            </div>
          </div>
          <div style={{ padding: '32px 28px' }}>
            <Suspense fallback={<div style={{ textAlign: 'center', color: 'var(--text4)' }}>Loading…</div>}>
              <VerifyContent />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
