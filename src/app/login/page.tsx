'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const DEMO_ACCOUNTS = [
  { name: 'Alex Owner',    role: 'Company Owner',    email: 'owner@acmefield.com',    password: 'owner123', label: 'Admin' },
  { name: 'Diana Dispatch', role: 'Dispatcher',      email: 'dispatch@acmefield.com', password: 'disp123',  label: 'Dispatch' },
  { name: 'Carlos M.',     role: 'HVAC Technician',  email: 'carlos@acmefield.com',   password: 'tech123',  label: 'Tech' },
]

const FEATURES = [
  'Real-time job tracking across your entire team',
  'Field-to-office sync that works offline too',
  'Dispatch, schedule, invoice — one platform',
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendEmail, setResendEmail]             = useState('')
  const [resendStatus, setResendStatus]           = useState<'idle' | 'sending' | 'sent'>('idle')

  // 2FA challenge state
  const [requires2FA, setRequires2FA]   = useState(false)
  const [pending2FAUserId, setPending2FAUserId] = useState('')
  const [twoFACode, setTwoFACode]       = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)

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
      // 2FA challenge required — show second step without setting session yet
      if (data.requires2FA) {
        setRequires2FA(true)
        setPending2FAUserId(data.userId)
        return
      }
      const dest = data.role === 'tech' ? '/field' : data.role === 'dispatcher' ? '/jobs' : '/dashboard'
      router.push(dest)
      router.refresh()
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handle2FAChallenge(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pending2FAUserId, code: twoFACode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Invalid code. Please try again.')
        return
      }
      // Session cookie has been set by the challenge route
      const meRes = await fetch('/api/auth/me')
      const me = await meRes.json()
      const dest = me.role === 'tech' ? '/field' : me.role === 'dispatcher' ? '/jobs' : '/dashboard'
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
    setRequires2FA(false)
    setTwoFACode('')
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
        @keyframes shimmer { 0%,100% { opacity:.45; } 50% { opacity:.9; } }
        @keyframes shake { 0%,100% { transform:translateX(0); } 25% { transform:translateX(-5px); } 75% { transform:translateX(5px); } }
        .wf-left  { display:flex !important; }
        .wf-mob   { display:none !important; }
        .wf-right { border-left:1px solid var(--border); }
        @media (max-width:700px) {
          .wf-left  { display:none !important; }
          .wf-mob   { display:flex !important; }
          .wf-right { border-left:none; }
        }
        .wf-input { transition:border-color 140ms, box-shadow 140ms; }
        .wf-input:focus { border-color:var(--amber) !important; box-shadow:0 0 0 3px rgba(245,158,11,.13); outline:none; }
        .wf-btn-primary { transition:background 140ms, box-shadow 140ms, transform 120ms; }
        .wf-btn-primary:hover:not(:disabled) { background:var(--amber-hover) !important; box-shadow:0 4px 18px rgba(245,158,11,.38); transform:translateY(-1px); }
        .wf-demo-row { transition:background 110ms; }
        .wf-demo-row:hover { background:var(--bg5) !important; }
        .wf-otp-input { letter-spacing:.3em; text-align:center; font-size:22px; font-weight:800; }
      `}</style>

      <div style={{ position:'fixed', inset:0, display:'flex', background:'var(--bg)', overflow:'hidden', fontFamily:'var(--font-body, system-ui)' }}>

        {/* LEFT PANEL */}
        <div className="wf-left" style={{
          flex: '0 0 54%',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 64px',
          position: 'relative',
          overflow: 'hidden',
          background: '#050810',
        }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 18% 60%, rgba(245,158,11,.13) 0%, transparent 50%), radial-gradient(ellipse at 85% 12%, rgba(59,130,246,.06) 0%, transparent 45%)' }} />
          <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle, rgba(255,255,255,.043) 1px, transparent 1px)', backgroundSize:'26px 26px' }} />
          <svg viewBox="-44 -44 88 88" style={{ position:'absolute', bottom:'-8%', right:'-5%', width:460, height:460, opacity:.038, fill:'var(--amber)', pointerEvents:'none' }}>
            <path d="M -10 -44 L -26 8 L -4 8 L -14 44 L 28 -10 L 6 -10 L 18 -44 Z" />
          </svg>
          <div style={{ position:'absolute', top:0, right:0, width:1, height:'100%', background:'linear-gradient(180deg, transparent 0%, rgba(245,158,11,.12) 40%, rgba(245,158,11,.06) 70%, transparent 100%)' }} />

          <div style={{ position:'relative', zIndex:1, maxWidth:420 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:52, animation:'fadeUp .5s cubic-bezier(.16,1,.3,1) both' }}>
              <div style={{ width:46, height:46, background:'var(--amber)', borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 28px rgba(245,158,11,.38)' }}>
                <svg viewBox="-44 -44 88 88" style={{ width:25, height:25 }}>
                  <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="#050810" />
                </svg>
              </div>
              <span style={{ fontSize:28, fontWeight:800, fontFamily:'var(--font-display, system-ui)', letterSpacing:'-.3px' }}>
                <span style={{ color:'var(--text)' }}>Work</span><span style={{ color:'var(--amber)' }}>Forge</span>
              </span>
            </div>

            <h1 style={{ fontFamily:'var(--font-display, system-ui)', fontSize:52, fontWeight:800, lineHeight:1.05, letterSpacing:'-.5px', color:'var(--text)', marginBottom:18, animation:'fadeUp .5s cubic-bezier(.16,1,.3,1) .06s both' }}>
              Forged for<br />
              the field.<br />
              <span style={{ color:'var(--amber)' }}>Built for control.</span>
            </h1>

            <p style={{ fontSize:15, color:'var(--text3)', lineHeight:1.65, marginBottom:44, animation:'fadeUp .5s cubic-bezier(.16,1,.3,1) .1s both' }}>
              The field operations platform built for service businesses — track jobs, dispatch your team, and get paid faster.
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:15 }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:13, animation:`fadeUp .5s cubic-bezier(.16,1,.3,1) ${.14 + i * .07}s both` }}>
                  <div style={{ width:22, height:22, borderRadius:6, flexShrink:0, background:'rgba(245,158,11,.13)', border:'1px solid rgba(245,158,11,.28)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg viewBox="0 0 14 14" style={{ width:10, height:10 }} fill="none">
                      <path d="M2.5 7l3 3L11.5 3.5" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span style={{ fontSize:14, color:'var(--text2)', lineHeight:1.4 }}>{f}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop:52, display:'inline-flex', alignItems:'center', gap:9, padding:'7px 14px', background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', borderRadius:30, animation:'fadeUp .5s cubic-bezier(.16,1,.3,1) .35s both' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', animation:'shimmer 2.5s ease infinite' }} />
              <span style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--font-mono, monospace)', letterSpacing:'.3px' }}>All systems operational</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="wf-right" style={{ flex:1, display:'flex', flexDirection:'column', overflowY:'auto', background:'var(--bg2)' }}>

          {/* Mobile logo bar */}
          <div className="wf-mob" style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', alignItems:'center', gap:10, flexShrink:0 }}>
            <div style={{ width:32, height:32, background:'var(--amber)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg viewBox="-44 -44 88 88" style={{ width:16, height:16 }}>
                <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="#050810" />
              </svg>
            </div>
            <span style={{ fontSize:20, fontWeight:800, fontFamily:'var(--font-display, system-ui)' }}>
              <span style={{ color:'var(--text)' }}>Work</span><span style={{ color:'var(--amber)' }}>Forge</span>
            </span>
          </div>

          {/* Form area */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'48px 44px', maxWidth:420, width:'100%', margin:'0 auto', animation:'fadeUp .4s cubic-bezier(.16,1,.3,1) .12s both' }}>

            {/* ── 2FA CHALLENGE STEP ── */}
            {requires2FA ? (
              <>
                <div style={{ marginBottom:30 }}>
                  {/* Shield icon */}
                  <div style={{ width:52, height:52, borderRadius:14, background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.22)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
                    <svg viewBox="0 0 24 24" style={{ width:26, height:26 }} fill="none">
                      <path d="M12 3L4 6.5v5C4 16.07 7.45 20.44 12 22c4.55-1.56 8-5.93 8-10.5v-5L12 3z" stroke="var(--amber)" strokeWidth="1.8" strokeLinejoin="round"/>
                      <path d="M9 12l2 2 4-4" stroke="var(--amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h2 style={{ fontSize:24, fontWeight:800, color:'var(--text)', letterSpacing:'-.4px', marginBottom:7 }}>Two-factor authentication</h2>
                  <p style={{ fontSize:14, color:'var(--text4)', lineHeight:1.5 }}>
                    {useBackupCode
                      ? 'Enter one of your saved backup codes.'
                      : 'Enter the 6-digit code from your authenticator app.'}
                  </p>
                </div>

                <form onSubmit={handle2FAChallenge} style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  {error && (
                    <div role="alert" style={{ background:'var(--red-dim)', border:'1px solid var(--red-border)', borderRadius:10, padding:'12px 16px', fontSize:13, color:'var(--red)', animation:'shake .3s ease', lineHeight:1.4 }}>
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="totp-code" style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:8 }}>
                      {useBackupCode ? 'Backup Code' : 'Authenticator Code'}
                    </label>
                    <input
                      id="totp-code"
                      className={`wf-input${useBackupCode ? '' : ' wf-otp-input'}`}
                      type="text"
                      value={twoFACode}
                      onChange={e => setTwoFACode(e.target.value)}
                      required
                      autoFocus
                      autoComplete="one-time-code"
                      inputMode={useBackupCode ? 'text' : 'numeric'}
                      placeholder={useBackupCode ? 'XXXXXXXX' : '000000'}
                      maxLength={useBackupCode ? 8 : 6}
                      style={{
                        width: '100%',
                        background: 'var(--bg3)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        color: 'var(--text)',
                        fontSize: useBackupCode ? 14 : 22,
                        fontWeight: 800,
                        padding: '14px',
                        fontFamily: 'var(--font-mono, monospace)',
                        letterSpacing: useBackupCode ? '.05em' : '.3em',
                        textAlign: 'center',
                        boxSizing: 'border-box' as const,
                      }}
                    />
                  </div>

                  <button type="submit" className="wf-btn-primary" disabled={loading} style={{
                    width: '100%', background: 'var(--amber)', color: '#050810',
                    border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800,
                    padding: '14px', cursor: loading ? 'wait' : 'pointer',
                    opacity: loading ? .6 : 1, marginTop: 2,
                    fontFamily: 'var(--font-display, inherit)', letterSpacing: '.3px',
                  }}>
                    {loading ? 'Verifying…' : 'Verify →'}
                  </button>
                </form>

                <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:10, alignItems:'center' }}>
                  <button
                    onClick={() => { setUseBackupCode(!useBackupCode); setTwoFACode(''); setError('') }}
                    style={{ background:'none', border:'none', color:'var(--amber)', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}
                  >
                    {useBackupCode ? 'Use authenticator app instead' : 'Use a backup code instead'}
                  </button>
                  <button
                    onClick={() => { setRequires2FA(false); setPending2FAUserId(''); setTwoFACode(''); setError('') }}
                    style={{ background:'none', border:'none', color:'var(--text4)', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}
                  >
                    Back to sign in
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom:34 }}>
                  <h2 style={{ fontSize:26, fontWeight:800, color:'var(--text)', letterSpacing:'-.4px', marginBottom:7 }}>Sign in</h2>
                  <p style={{ fontSize:14, color:'var(--text4)' }}>Welcome back — enter your credentials to continue.</p>
                </div>

                {needsVerification ? (
                  <div style={{ textAlign:'center', padding:'12px 0' }}>
                    <div style={{ width:54, height:54, borderRadius:'50%', background:'rgba(91,163,245,.1)', border:'1px solid rgba(91,163,245,.22)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                      <svg viewBox="0 0 24 24" style={{ width:24, height:24 }} fill="none">
                        <rect x="3" y="5" width="18" height="14" rx="2" stroke="var(--blue-light)" strokeWidth="1.8"/>
                        <path d="M3 8l9 5.5L21 8" stroke="var(--blue-light)" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Verify your email</div>
                    <div style={{ fontSize:13, color:'var(--text4)', lineHeight:1.6, marginBottom:20 }}>
                      Click the link we sent to{' '}
                      <strong style={{ color:'var(--text)', fontFamily:'var(--font-mono, monospace)', fontSize:12 }}>{resendEmail}</strong>{', '}
                      then sign in here.
                    </div>
                    {resendStatus === 'sent' ? (
                      <div style={{ fontSize:13, color:'var(--green)', marginBottom:16 }}>Email resent — check your inbox.</div>
                    ) : (
                      <button onClick={handleResend} disabled={resendStatus === 'sending'}
                        style={{ padding:'10px 20px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10, fontSize:13, fontWeight:600, color:'var(--text)', cursor:resendStatus === 'sending' ? 'wait' : 'pointer', marginBottom:16, fontFamily:'inherit' }}>
                        {resendStatus === 'sending' ? 'Sending…' : 'Resend verification email'}
                      </button>
                    )}
                    <button onClick={() => { setNeedsVerification(false); setResendStatus('idle') }}
                      style={{ background:'none', border:'none', color:'var(--amber)', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                      Back to sign in
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:18 }}>
                    {error && (
                      <div role="alert" style={{ background:'var(--red-dim)', border:'1px solid var(--red-border)', borderRadius:10, padding:'12px 16px', fontSize:13, color:'var(--red)', animation:'shake .3s ease', lineHeight:1.4 }}>
                        {error}
                      </div>
                    )}

                    <div>
                      <label htmlFor="login-email" style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:8 }}>Email Address</label>
                      <input id="login-email" className="wf-input"
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        required autoFocus placeholder="you@company.com"
                        style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:14, padding:'12px 14px', fontFamily:'inherit', boxSizing:'border-box' as const }}
                      />
                    </div>

                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
                        <label htmlFor="login-password" style={{ fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'.8px' }}>Password</label>
                        <Link href="/forgot-password" style={{ fontSize:12, color:'var(--amber)', fontWeight:600, textDecoration:'none' }}>Forgot?</Link>
                      </div>
                      <input id="login-password" className="wf-input"
                        type="password" value={password} onChange={e => setPassword(e.target.value)}
                        required placeholder="••••••••"
                        style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:14, padding:'12px 14px', fontFamily:'inherit', boxSizing:'border-box' as const }}
                      />
                    </div>

                    <button type="submit" className="wf-btn-primary" disabled={loading} style={{
                      width:'100%', background:'var(--amber)', color:'#050810',
                      border:'none', borderRadius:10, fontSize:15, fontWeight:800,
                      padding:'14px', cursor:loading ? 'wait' : 'pointer',
                      opacity:loading ? .6 : 1, marginTop:2,
                      fontFamily:'var(--font-display, inherit)', letterSpacing:'.3px',
                    }}>
                      {loading ? 'Signing in…' : 'Sign In →'}
                    </button>
                  </form>
                )}

                <p style={{ textAlign:'center', fontSize:13, color:'var(--text4)', marginTop:22 }}>
                  New business?{' '}
                  <Link href="/register" style={{ color:'var(--amber)', fontWeight:700, textDecoration:'none' }}>
                    Create a workspace →
                  </Link>
                </p>

                {/* Demo accounts */}
                <div style={{ marginTop:28, background:'var(--bg3)', borderRadius:14, border:'1px solid var(--border)', overflow:'hidden' }}>
                  <div style={{ padding:'9px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--amber)', flexShrink:0 }} />
                    <span style={{ fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'.8px' }}>Try a Demo Account</span>
                  </div>
                  <div>
                    {DEMO_ACCOUNTS.map((acc, i) => (
                      <button key={acc.email} className="wf-demo-row" onClick={() => fillDemo(acc)} style={{
                        display:'flex', alignItems:'center', gap:12, padding:'11px 16px',
                        background:'transparent', border:'none',
                        borderBottom: i < DEMO_ACCOUNTS.length - 1 ? '1px solid var(--border)' : 'none',
                        cursor:'pointer', textAlign:'left', width:'100%', fontFamily:'inherit',
                      }}>
                        <div style={{ width:34, height:34, borderRadius:9, background:'var(--bg5)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
                          {acc.label === 'Admin' ? '🏢' : acc.label === 'Dispatch' ? '📋' : '🔧'}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{acc.name}</div>
                          <div style={{ fontSize:11, color:'var(--text4)', fontFamily:'var(--font-mono, monospace)' }}>{acc.email}</div>
                        </div>
                        <span style={{ fontSize:9, fontWeight:800, letterSpacing:'.6px', textTransform:'uppercase', padding:'3px 8px', borderRadius:20, background:'var(--amber-dim)', color:'var(--amber)', border:'1px solid var(--amber-border)', flexShrink:0 }}>
                          {acc.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
