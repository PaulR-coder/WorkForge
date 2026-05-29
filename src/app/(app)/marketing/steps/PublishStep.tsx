'use client'

import { useState, useEffect } from 'react'
import type { SelectedVariation } from './CopyStep'
import { PUBLISHABLE_TOOLS } from '@/lib/social/generate-prompts'

interface SocialConnection {
  id: string
  platform: string
  accountId: string
  accountName: string
  tokenExpiry?: string | null
  createdAt: string
}

interface PublishResult {
  connectionId: string
  platform: string
  accountName: string
  success: boolean
  error?: string
  postUrl?: string
}

interface Props {
  selected: SelectedVariation
  imageUrl: string | undefined
  imageBase64: string | undefined
  onBack: () => void
  onStartOver: () => void
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  google_business: 'Google Business',
}

const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘',
  instagram: '📷',
  linkedin: '💼',
  google_business: '🔍',
}

const ALL_PLATFORMS = ['facebook', 'instagram', 'linkedin', 'google_business']

function formatCopyPreview(selected: SelectedVariation): string {
  const v = selected.variation
  switch (selected.tool) {
    case 'social_post': return String(v.caption ?? '')
    case 'facebook_ad': return String(v.primaryText ?? '')
    case 'service_description': return `${String(v.pageHeadline ?? '')}\n\n${String(v.bodyCopy ?? '').slice(0, 300)}`
    case 'google_ad': return `${String(v.headline1 ?? '')} | ${String(v.headline2 ?? '')}`
    case 'email_campaign': return String(v.subjectLine ?? '')
    case 'review_response': return String(v.response ?? '')
    default: return ''
  }
}

export default function PublishStep({ selected, imageUrl, imageBase64, onBack, onStartOver }: Props) {
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [connectionsLoading, setConnectionsLoading] = useState(true)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [publishing, setPublishing] = useState(false)
  const [results, setResults] = useState<PublishResult[] | null>(null)

  const isPublishable = PUBLISHABLE_TOOLS.includes(selected.tool as typeof PUBLISHABLE_TOOLS[number])
  const copyText = formatCopyPreview(selected)

  useEffect(() => {
    fetch('/api/social/connections')
      .then((r) => r.json())
      .then((d: { connections?: SocialConnection[] }) => {
        const conns = d.connections ?? []
        setConnections(conns)
        setCheckedIds(new Set(conns.map((c) => c.id)))
      })
      .catch(() => setConnections([]))
      .finally(() => setConnectionsLoading(false))
  }, [])

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handlePublish() {
    const connectionIds = [...checkedIds]
    if (connectionIds.length === 0) return
    setPublishing(true)
    try {
      const res = await fetch('/api/marketing/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy: selected.variation, tool: selected.tool, imageUrl, imageBase64, connectionIds }),
      })
      const data = await res.json() as { results?: PublishResult[] }
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setPublishing(false)
    }
  }

  function handleDownloadImage() {
    const url = imageUrl ?? imageBase64
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = 'marketing-image.jpg'
    a.click()
  }

  function handleCopyText() {
    navigator.clipboard.writeText(copyText).catch(() => { /* silent */ })
  }

  const bg2 = 'var(--bg2)'
  const border = '1px solid var(--border)'
  const checkedCount = checkedIds.size

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Left: preview + downloads */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ background: bg2, border, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
          {(imageUrl || imageBase64) && (
            <img src={imageUrl ?? imageBase64} alt="Post" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} />
          )}
          <div style={{ padding: 18 }}>
            <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16 }}>
              {copyText || <em style={{ color: 'var(--text4)' }}>No copy</em>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(imageUrl || imageBase64) && (
                <button
                  onClick={handleDownloadImage}
                  style={{ flex: 1, background: 'var(--bg3)', border, borderRadius: 10, padding: '11px 14px', fontSize: 13, fontWeight: 700, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  ⬇ Download Image
                </button>
              )}
              <button
                onClick={handleCopyText}
                style={{ flex: 1, background: 'var(--bg3)', border, borderRadius: 10, padding: '11px 14px', fontSize: 13, fontWeight: 700, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                📋 Copy Text
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--text4)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}
        >
          ← Back to Image
        </button>
      </div>

      {/* Right: platform slots + publish */}
      <div style={{ width: 320, flexShrink: 0 }}>
        <div style={{ background: bg2, border, borderRadius: 14, padding: 20 }}>
          {!isPublishable ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text4)', fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📄</div>
              This content type is for <strong>download only</strong> — copy it into your ad platform or website.
            </div>
          ) : results ? (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 14 }}>Publish Results</div>
              {results.map((r) => (
                <div key={r.connectionId} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '10px 12px', background: r.success ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)', border: `1px solid ${r.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 10 }}>
                  <span>{r.success ? '✓' : '✗'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: r.success ? 'var(--green)' : 'var(--red)' }}>{r.accountName}</div>
                    {r.error && <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{r.error}</div>}
                  </div>
                </div>
              ))}
              <button
                onClick={onStartOver}
                style={{ width: '100%', marginTop: 10, background: 'var(--amber)', color: '#050810', border: 'none', borderRadius: 10, padding: '13px 16px', fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-display)', cursor: 'pointer' }}
              >
                Start Over
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Publish To</div>
              <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 16 }}>Connect your accounts in Settings to enable publishing.</div>

              {connectionsLoading ? (
                <div style={{ color: 'var(--text4)', fontSize: 13 }}>Loading accounts…</div>
              ) : (
                ALL_PLATFORMS.map((platform) => {
                  const platformConns = connections.filter((c) => c.platform === platform)
                  return (
                    <div key={platform} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{PLATFORM_ICONS[platform]}</span> {PLATFORM_LABELS[platform]}
                      </div>

                      {platformConns.length === 0 ? (
                        <a
                          href={`/api/social/auth/${platform}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'block', textAlign: 'center', padding: '8px 14px', background: 'var(--bg3)', border, borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}
                        >
                          Connect {PLATFORM_LABELS[platform]}
                        </a>
                      ) : (
                        platformConns.map((conn) => (
                          <label
                            key={conn.id}
                            aria-label={conn.accountName}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg3)', border: checkedIds.has(conn.id) ? '1px solid rgba(245,158,11,0.3)' : border, borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}
                          >
                            <input
                              type="checkbox"
                              checked={checkedIds.has(conn.id)}
                              onChange={() => toggleCheck(conn.id)}
                              style={{ accentColor: 'var(--amber)', width: 15, height: 15 }}
                            />
                            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{conn.accountName}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )
                })
              )}

              <button
                onClick={handlePublish}
                disabled={publishing || checkedCount === 0}
                style={{
                  width: '100%', marginTop: 8,
                  background: checkedCount > 0 ? 'var(--amber)' : 'var(--bg3)',
                  color: checkedCount > 0 ? '#050810' : 'var(--text4)',
                  border: checkedCount > 0 ? 'none' : border,
                  borderRadius: 10, padding: '13px 16px', fontSize: 14, fontWeight: 800,
                  fontFamily: 'var(--font-display)', cursor: publishing || checkedCount === 0 ? 'not-allowed' : 'pointer',
                  opacity: publishing || checkedCount === 0 ? 0.5 : 1,
                }}
              >
                {publishing ? 'Publishing…' : `Publish Now${checkedCount > 0 ? ` to ${checkedCount} platform${checkedCount !== 1 ? 's' : ''}` : ''}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
