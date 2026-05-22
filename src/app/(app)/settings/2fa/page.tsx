'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

type Step = 'status' | 'setup-qr' | 'setup-verify' | 'setup-codes' | 'disable'

interface SetupData {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
}

export default function TwoFactorPage() {
  const [twoFAEnabled, setTwoFAEnabled] = useState<boolean | null>(null)
  const [step, setStep]                 = useState<Step>('status')
  const [setupData, setSetupData]       = useState<SetupData | null>(null)
  const [verifyCode, setVerifyCode]     = useState('')
  const [disableCode, setDisableCode]   = useState('')
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [showSecret, setShowSecret]     = useState(false)
  const [copiedIdx, setCopiedIdx]       = useState<number | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setTwoFAEnabled(!!data.twoFactorEnabled)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  async function startSetup() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/setup')
      if (!res.ok) throw new Error('Failed to start setup')
      const data: SetupData = await res.json()
      setSetupData(data)
      setStep('setup-qr')
    } catch {
      setError('Could not load setup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function confirmCode() {
    if (!setupData) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: setupData.secret,
          code: verifyCode.replace(/\s/g, ''),
          backupCodes: setupData.backupCodes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Invalid code — check your app and try again.')
        return
      }
      setStep('setup-codes')
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function finishSetup() {
    setTwoFAEnabled(true)
    setStep('status')
    setSetupData(null)
    setVerifyCode('')
  }

  async function handleDisable() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode.replace(/\s/g, '') }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Invalid code.')
        return
      }
      setTwoFAEnabled(false)
      setStep('status')
      setDisableCode('')
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function copyCode(code: string, idx: number) {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch { /* ignore */ }
  }

  async function copyAllCodes() {
    if (!setupData) return
    try {
      await navigator.clipboard.writeText(setupData.backupCodes.join('\n'))
      setCopiedIdx(-1)
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch { /* ignore */ }
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '28px 32px',
    maxWidth: 540,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text)',
    fontSize: 14,
    padding: '12px 14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  const primaryBtn = (disabled = false): React.CSSProperties => ({
    background: disabled ? 'var(--bg4)' : 'var(--amber)',
    color: disabled ? 'var(--text4)' : '#050810',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 800,
    padding: '12px 20px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-display, inherit)',
    letterSpacing: '.3px',
    opacity: (loading && !disabled) ? .6 : 1,
  })

  const ghostBtn: React.CSSProperties = {
    background: 'var(--bg3)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    padding: '12px 20px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  }

  const dangerBtn: React.CSSProperties = {
    background: 'var(--red-dim)',
    color: 'var(--red)',
    border: '1px solid var(--red-border)',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    padding: '12px 20px',
    cursor: loading ? 'wait' : 'pointer',
    fontFamily: 'inherit',
    opacity: loading ? .6 : 1,
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (twoFAEnabled === null) {
    return (
      <div style={{ padding: '32px 28px' }}>
        <div style={{ height: 28, width: 200, background: 'var(--bg3)', borderRadius: 8, marginBottom: 8 }} />
        <div style={{ height: 16, width: 320, background: 'var(--bg3)', borderRadius: 6, marginBottom: 32 }} />
        <div style={{ height: 120, width: 540, background: 'var(--bg3)', borderRadius: 16 }} />
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        @keyframes shake { 0%,100% { transform:translateX(0); } 25% { transform:translateX(-5px); } 75% { transform:translateX(5px); } }
        .tfa-input:focus { border-color:var(--amber) !important; box-shadow:0 0 0 3px rgba(245,158,11,.13); outline:none; }
        .tfa-btn-ghost:hover { background:var(--bg4) !important; }
        .tfa-btn-primary:hover:not(:disabled) { filter:brightness(1.08); }
        .tfa-copy-btn:hover { background:var(--bg4) !important; }
        .tfa-code-row:hover { background:var(--bg3) !important; }
      `}</style>

      <div style={{ padding: '32px 28px', animation: 'fadeUp .35s cubic-bezier(.16,1,.3,1) both' }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display, system-ui)', fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.3px', marginBottom: 6 }}>
            Two-Factor Authentication
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text4)', lineHeight: 1.5 }}>
            Add an extra layer of security to your account using an authenticator app.
          </p>
        </div>

        {/* ── STATUS CARD ─────────────────────────────────────────────────── */}
        {step === 'status' && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
              {/* Shield icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 13, flexShrink: 0,
                background: twoFAEnabled ? 'rgba(34,197,94,.1)' : 'rgba(245,158,11,.08)',
                border: `1px solid ${twoFAEnabled ? 'rgba(34,197,94,.25)' : 'rgba(245,158,11,.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg viewBox="0 0 24 24" style={{ width: 24, height: 24 }} fill="none">
                  <path d="M12 3L4 6.5v5C4 16.07 7.45 20.44 12 22c4.55-1.56 8-5.93 8-10.5v-5L12 3z"
                    stroke={twoFAEnabled ? 'var(--green)' : 'var(--amber)'} strokeWidth="1.8" strokeLinejoin="round"/>
                  {twoFAEnabled
                    ? <path d="M9 12l2 2 4-4" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    : <path d="M12 9v4M12 16.5v.5" stroke="var(--amber)" strokeWidth="1.8" strokeLinecap="round"/>
                  }
                </svg>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                    Two-Factor Authentication
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase',
                    padding: '2px 9px', borderRadius: 20,
                    background: twoFAEnabled ? 'rgba(34,197,94,.1)' : 'rgba(245,158,11,.1)',
                    color: twoFAEnabled ? 'var(--green)' : 'var(--amber)',
                    border: `1px solid ${twoFAEnabled ? 'rgba(34,197,94,.25)' : 'rgba(245,158,11,.22)'}`,
                  }}>
                    {twoFAEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text4)', lineHeight: 1.55 }}>
                  {twoFAEnabled
                    ? 'Your account is protected. You\'ll be prompted for a verification code each time you sign in.'
                    : 'Protect your account by requiring a verification code from an authenticator app in addition to your password.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {twoFAEnabled ? (
                <button
                  className="tfa-btn-ghost"
                  onClick={() => { setStep('disable'); setError('') }}
                  style={dangerBtn}
                >
                  Disable 2FA
                </button>
              ) : (
                <button
                  className="tfa-btn-primary"
                  onClick={startSetup}
                  disabled={loading}
                  style={primaryBtn(false)}
                >
                  {loading ? 'Loading…' : 'Enable 2FA'}
                </button>
              )}
            </div>

            {twoFAEnabled && (
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Lost access to your authenticator?</strong>
                  If you've lost your device, use one of your saved backup codes to sign in, then disable and re-enable 2FA to generate new codes.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SETUP STEP 1: QR Code ───────────────────────────────────────── */}
        {step === 'setup-qr' && setupData && (
          <div style={{ ...card, maxWidth: 580 }}>
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
              {['Scan', 'Verify', 'Save codes'].map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i === 0 ? 'var(--amber)' : 'var(--bg4)',
                    color: i === 0 ? '#050810' : 'var(--text4)',
                  }}>{i + 1}</div>
                  <span style={{ fontSize: 12, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? 'var(--text)' : 'var(--text4)' }}>{s}</span>
                  {i < 2 && <span style={{ color: 'var(--border)', fontSize: 14, margin: '0 2px' }}>›</span>}
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Scan this QR code</h2>
            <p style={{ fontSize: 13, color: 'var(--text4)', marginBottom: 24, lineHeight: 1.5 }}>
              Open your authenticator app (Google Authenticator, Authy, 1Password, etc.) and scan the code below.
            </p>

            <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* QR Code */}
              <div style={{
                background: '#050810', border: '2px solid var(--border)', borderRadius: 14,
                padding: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Image
                  src={setupData.qrCodeUrl}
                  alt="2FA QR Code"
                  width={200}
                  height={200}
                  style={{ display: 'block', imageRendering: 'pixelated' }}
                  unoptimized
                />
              </div>

              {/* Manual entry */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 8 }}>
                  Can't scan? Enter manually:
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
                    padding: '10px 44px 10px 12px',
                    fontSize: 13, fontFamily: 'var(--font-mono, monospace)', fontWeight: 700,
                    color: showSecret ? 'var(--text)' : 'var(--text4)',
                    letterSpacing: showSecret ? '.12em' : 'normal',
                    wordBreak: 'break-all', lineHeight: 1.6,
                    filter: showSecret ? 'none' : 'blur(5px)',
                    userSelect: showSecret ? 'text' : 'none',
                    transition: 'filter .2s',
                  }}>
                    {setupData.secret}
                  </div>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    title={showSecret ? 'Hide secret' : 'Reveal secret'}
                    style={{
                      position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)',
                      padding: 4, display: 'flex',
                    }}
                  >
                    {showSecret ? (
                      <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }} fill="none">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        <path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }} fill="none">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
                      </svg>
                    )}
                  </button>
                </div>

                <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 10, lineHeight: 1.5 }}>
                  Select <strong>Time-based</strong> when adding manually. The app will generate a new 6-digit code every 30 seconds.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <button
                className="tfa-btn-primary"
                onClick={() => { setStep('setup-verify'); setError(''); setVerifyCode('') }}
                style={primaryBtn(false)}
              >
                I've scanned it →
              </button>
              <button
                className="tfa-btn-ghost"
                onClick={() => { setStep('status'); setSetupData(null) }}
                style={ghostBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── SETUP STEP 2: Verify Code ────────────────────────────────────── */}
        {step === 'setup-verify' && setupData && (
          <div style={card}>
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
              {['Scan', 'Verify', 'Save codes'].map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i === 1 ? 'var(--amber)' : i < 1 ? 'rgba(34,197,94,.2)' : 'var(--bg4)',
                    color: i === 1 ? '#050810' : i < 1 ? 'var(--green)' : 'var(--text4)',
                  }}>{i < 1 ? '✓' : i + 1}</div>
                  <span style={{ fontSize: 12, fontWeight: i === 1 ? 700 : 400, color: i === 1 ? 'var(--text)' : 'var(--text4)' }}>{s}</span>
                  {i < 2 && <span style={{ color: 'var(--border)', fontSize: 14, margin: '0 2px' }}>›</span>}
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Confirm your authenticator</h2>
            <p style={{ fontSize: 13, color: 'var(--text4)', marginBottom: 22, lineHeight: 1.5 }}>
              Enter the 6-digit code currently shown in your authenticator app to verify the setup.
            </p>

            {error && (
              <div role="alert" style={{ background: 'var(--red-dim)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 18, animation: 'shake .3s ease' }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>
                Verification Code
              </label>
              <input
                className="tfa-input"
                type="text"
                inputMode="numeric"
                autoFocus
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => { if (e.key === 'Enter' && verifyCode.length === 6) void confirmCode() }}
                style={{
                  ...inputStyle,
                  fontSize: 26, fontWeight: 800, letterSpacing: '.35em', textAlign: 'center',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="tfa-btn-primary"
                onClick={confirmCode}
                disabled={loading || verifyCode.length !== 6}
                style={primaryBtn(verifyCode.length !== 6)}
              >
                {loading ? 'Verifying…' : 'Verify code →'}
              </button>
              <button
                className="tfa-btn-ghost"
                onClick={() => { setStep('setup-qr'); setError('') }}
                style={ghostBtn}
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* ── SETUP STEP 3: Backup Codes ───────────────────────────────────── */}
        {step === 'setup-codes' && setupData && (
          <div style={{ ...card, maxWidth: 580 }}>
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
              {['Scan', 'Verify', 'Save codes'].map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i === 2 ? 'var(--amber)' : 'rgba(34,197,94,.2)',
                    color: i === 2 ? '#050810' : 'var(--green)',
                  }}>{i < 2 ? '✓' : i + 1}</div>
                  <span style={{ fontSize: 12, fontWeight: i === 2 ? 700 : 400, color: i === 2 ? 'var(--text)' : 'var(--text4)' }}>{s}</span>
                  {i < 2 && <span style={{ color: 'var(--border)', fontSize: 14, margin: '0 2px' }}>›</span>}
                </div>
              ))}
            </div>

            {/* Success banner */}
            <div style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 12, marginBottom: 24 }}>
              <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, flexShrink: 0 }} fill="none">
                <path d="M12 3L4 6.5v5C4 16.07 7.45 20.44 12 22c4.55-1.56 8-5.93 8-10.5v-5L12 3z" stroke="var(--green)" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)', marginBottom: 2 }}>2FA is now active</div>
                <div style={{ fontSize: 12, color: 'var(--text4)' }}>Save these backup codes before continuing. Each code can only be used once.</div>
              </div>
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Save your backup codes</h2>
            <p style={{ fontSize: 13, color: 'var(--text4)', marginBottom: 20, lineHeight: 1.5 }}>
              Store these somewhere safe. If you lose access to your authenticator app, you can use any of these codes to sign in instead.
            </p>

            {/* Codes grid */}
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              {setupData.backupCodes.map((code, i) => (
                <div key={i} className="tfa-code-row" onClick={() => void copyCode(code, i)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', cursor: 'pointer',
                  borderBottom: i < setupData.backupCodes.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background .1s',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '.12em' }}>
                    {code.slice(0, 4)}-{code.slice(4)}
                  </span>
                  <span style={{ fontSize: 11, color: copiedIdx === i ? 'var(--green)' : 'var(--text4)', fontWeight: 600 }}>
                    {copiedIdx === i ? 'Copied!' : 'Click to copy'}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <button
                className="tfa-copy-btn"
                onClick={copyAllCodes}
                style={{ ...ghostBtn, fontSize: 13 }}
              >
                {copiedIdx === -1 ? 'All codes copied!' : 'Copy all codes'}
              </button>
            </div>

            <div style={{ padding: '11px 14px', background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.18)', borderRadius: 10, fontSize: 12, color: 'var(--text3)', lineHeight: 1.55, marginBottom: 22 }}>
              <strong style={{ color: 'var(--amber)' }}>These codes will not be shown again.</strong>{' '}
              Keep them in a password manager, printed paper, or another secure location.
            </div>

            <button
              className="tfa-btn-primary"
              onClick={finishSetup}
              style={primaryBtn(false)}
            >
              Done — I've saved my codes
            </button>
          </div>
        )}

        {/* ── DISABLE 2FA ──────────────────────────────────────────────────── */}
        {step === 'disable' && (
          <div style={card}>
            <div style={{ display: 'flex', gap: 14, marginBottom: 22, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" style={{ width: 22, height: 22 }} fill="none">
                  <path d="M12 3L4 6.5v5C4 16.07 7.45 20.44 12 22c4.55-1.56 8-5.93 8-10.5v-5L12 3z" stroke="var(--red)" strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M12 9v4M12 16.5v.5" stroke="var(--red)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Disable Two-Factor Authentication</h2>
                <p style={{ fontSize: 13, color: 'var(--text4)', lineHeight: 1.5 }}>
                  Enter your current authenticator code (or a backup code) to confirm. Disabling 2FA will make your account less secure.
                </p>
              </div>
            </div>

            {error && (
              <div role="alert" style={{ background: 'var(--red-dim)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 18, animation: 'shake .3s ease' }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>
                Authenticator Code or Backup Code
              </label>
              <input
                className="tfa-input"
                type="text"
                autoFocus
                autoComplete="one-time-code"
                placeholder="000000 or backup code"
                value={disableCode}
                onChange={e => setDisableCode(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && disableCode.length >= 6) void handleDisable() }}
                style={{ ...inputStyle, fontFamily: 'var(--font-mono, monospace)', fontSize: 16, fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleDisable}
                disabled={loading || disableCode.length < 6}
                style={dangerBtn}
              >
                {loading ? 'Disabling…' : 'Disable 2FA'}
              </button>
              <button
                className="tfa-btn-ghost"
                onClick={() => { setStep('status'); setDisableCode(''); setError('') }}
                style={ghostBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
