'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SessionInfo {
  name: string
  email: string
  role: string
  lastLogin: string | null
}

function parseBrowser(ua: string): string {
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  return 'Unknown Browser'
}

function parseOS(ua: string): string {
  if (ua.includes('Windows NT')) return 'Windows'
  if (ua.includes('Mac OS X')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  if (ua.includes('Android')) return 'Android'
  return 'Unknown OS'
}

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function SessionsPage() {
  const router = useRouter()
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [loading, setLoading]         = useState(true)
  const [signingOut, setSigningOut]   = useState(false)
  const [browser, setBrowser]         = useState('')
  const [os, setOs]                   = useState('')

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/sessions')
      if (res.ok) {
        const data = await res.json()
        setSessionInfo(data.currentSession)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSession()
    if (typeof navigator !== 'undefined') {
      setBrowser(parseBrowser(navigator.userAgent))
      setOs(parseOS(navigator.userAgent))
    }
  }, [loadSession])

  async function handleSignOutAll() {
    setSigningOut(true)
    try {
      await fetch('/api/auth/sessions', { method: 'DELETE' })
      router.push('/login?reason=signed_out_all')
    } catch {
      setSigningOut(false)
    }
  }

  const ROLE_COLOR: Record<string, string> = {
    superadmin: '#a78bfa', admin: '#f59e0b', dispatcher: '#5ba3f5',
    tech: '#22c55e', readonly: '#64748b',
  }

  const card: React.CSSProperties = {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '24px 28px', maxWidth: 560,
  }

  if (loading) {
    return (
      <div style={{ padding: '32px 28px' }}>
        <div style={{ height: 28, width: 220, background: 'var(--bg3)', borderRadius: 8, marginBottom: 8 }} />
        <div style={{ height: 16, width: 300, background: 'var(--bg3)', borderRadius: 6, marginBottom: 32 }} />
        <div style={{ height: 160, width: 560, background: 'var(--bg3)', borderRadius: 16 }} />
      </div>
    )
  }

  const roleColor = ROLE_COLOR[sessionInfo?.role ?? ''] ?? '#64748b'

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        .sess-btn-danger:hover { filter: brightness(1.1); }
      `}</style>

      <div style={{ padding: '32px 28px', animation: 'fadeUp .35s cubic-bezier(.16,1,.3,1) both' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display, system-ui)', fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.3px', marginBottom: 6 }}>
            Active Sessions
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text4)', lineHeight: 1.5 }}>
            Manage your login sessions and sign out of all devices.
          </p>
        </div>

        {sessionInfo && (
          <>
            {/* Current session card */}
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                {/* Device icon */}
                <div style={{
                  width: 48, height: 48, borderRadius: 13, flexShrink: 0,
                  background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>
                  🖥️
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                      {browser} on {os}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                      background: 'rgba(34,197,94,.1)', color: 'var(--green)',
                      border: '1px solid rgba(34,197,94,.25)', letterSpacing: '.4px',
                    }}>
                      Current Session
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text4)' }}>
                    {sessionInfo.lastLogin
                      ? `Last login ${relativeDate(sessionInfo.lastLogin)}`
                      : 'First login'}
                  </div>
                </div>
              </div>

              {/* User info */}
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: roleColor,
                    color: '#060a17', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, flexShrink: 0,
                  }}>
                    {sessionInfo.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{sessionInfo.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text4)' }}>{sessionInfo.email}</div>
                  </div>
                  <span style={{
                    marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    background: `${roleColor}22`, color: roleColor, border: `1px solid ${roleColor}33`,
                    textTransform: 'capitalize', letterSpacing: '.2px',
                  }}>
                    {sessionInfo.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Sign out info */}
            <div style={{
              padding: '13px 16px', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.18)',
              borderRadius: 10, fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 20, maxWidth: 560,
            }}>
              <strong style={{ color: 'var(--amber)' }}>Session-based auth:</strong>{' '}
              Signing out will immediately end your current session. Any other active sessions (other browsers or devices) will expire naturally within 24 hours at their regular cookie expiry.
            </div>

            {/* Sign out button */}
            <button
              className="sess-btn-danger"
              onClick={handleSignOutAll}
              disabled={signingOut}
              style={{
                background: 'rgba(239,68,68,.1)', color: 'var(--red)',
                border: '1px solid rgba(239,68,68,.25)', borderRadius: 10,
                fontSize: 14, fontWeight: 700, padding: '12px 22px',
                cursor: signingOut ? 'wait' : 'pointer', opacity: signingOut ? .6 : 1,
                fontFamily: 'inherit', transition: 'all .15s ease',
              }}
            >
              {signingOut ? 'Signing out…' : '🚪 Sign Out All Devices'}
            </button>
          </>
        )}
      </div>
    </>
  )
}
