'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

interface SocialConnection {
  id: string
  platform: string
  accountId: string
  accountName: string
  tokenExpiry?: string | null
  createdAt: string
}

const PLATFORM_CONFIG = [
  { platform: 'facebook', label: 'Facebook', icon: '📘', authPlatform: 'facebook', description: 'Connect your Facebook Pages to publish posts directly.' },
  { platform: 'instagram', label: 'Instagram', icon: '📷', authPlatform: null, description: 'Instagram accounts appear automatically when your Facebook Page has a linked Instagram Business account.' },
  { platform: 'linkedin', label: 'LinkedIn', icon: '💼', authPlatform: 'linkedin', description: 'Connect your LinkedIn company pages.' },
  { platform: 'google_business', label: 'Google Business', icon: '🔍', authPlatform: 'google_business', description: 'Connect your Google Business Profile locations.' },
]

export default function SocialAccountsClient() {
  const searchParams = useSearchParams()
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/social/connections')
      const data = await res.json() as { connections?: SocialConnection[] }
      setConnections(data.connections ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected === 'true') setBanner({ type: 'success', message: 'Account connected successfully!' })
    if (error === 'oauth_cancelled') setBanner({ type: 'error', message: 'Connection cancelled.' })
    if (error === 'oauth_failed') setBanner({ type: 'error', message: 'OAuth failed — please try again.' })
    if (error === 'oauth_state_mismatch') setBanner({ type: 'error', message: 'Security check failed. Please try connecting again.' })
  }, [searchParams])

  async function handleDisconnect(id: string) {
    setDisconnecting(id)
    try {
      await fetch(`/api/social/connections/${id}`, { method: 'DELETE' })
      await load()
    } finally {
      setDisconnecting(null)
    }
  }

  const bg2 = 'var(--bg2)'
  const border = '1px solid var(--border)'

  return (
    <div style={{ padding: '24px 20px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0, marginBottom: 6 }}>
          Social Accounts
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text4)', margin: 0 }}>
          Connect your social accounts to publish AI-generated content directly from the Marketing tab.
        </p>
      </div>

      {banner && (
        <div style={{
          background: banner.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${banner.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          borderRadius: 12, padding: '13px 18px', marginBottom: 20, fontSize: 14,
          color: banner.type === 'success' ? 'var(--green)' : 'var(--red)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{banner.type === 'success' ? '✓' : '⚠️'} {banner.message}</span>
          <button onClick={() => setBanner(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {PLATFORM_CONFIG.map(({ platform, label, icon, authPlatform, description }) => {
        const platformConns = connections.filter((c) => c.platform === platform)
        return (
          <div key={platform} style={{ background: bg2, border, borderRadius: 14, padding: 20, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: platformConns.length > 0 ? 14 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg3)', border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text4)', maxWidth: 380 }}>{description}</div>
                </div>
              </div>
              {authPlatform && !loading && (
                <a
                  href={`/api/social/auth/${authPlatform}`}
                  style={{ background: 'var(--bg3)', border, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, color: 'var(--text)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 14 }}
                >
                  Connect {label}
                </a>
              )}
            </div>

            {loading && <div style={{ fontSize: 13, color: 'var(--text4)' }}>Loading…</div>}

            {!loading && platformConns.map((conn) => (
              <div key={conn.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg3)', border, borderRadius: 10, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{conn.accountName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>
                    Connected {new Date(conn.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnect(conn.id)}
                  disabled={disconnecting === conn.id}
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'var(--red)', cursor: 'pointer', opacity: disconnecting === conn.id ? 0.5 : 1 }}
                >
                  {disconnecting === conn.id ? 'Disconnecting…' : 'Disconnect'}
                </button>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
