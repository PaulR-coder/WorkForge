'use client'

import { useState, useEffect, useCallback } from 'react'

type FeatureStatus = 'pending' | 'planned' | 'in_progress' | 'done' | 'rejected'
type Tab = 'all' | 'mine' | 'planned' | 'done'

interface FeatureRequest {
  id: string
  title: string
  description: string
  status: FeatureStatus
  upvotes: number
  createdAt: string
  userId: string
  user: { name: string; initials: string }
  votes: { id: string }[]
}

const STATUS_LABEL: Record<FeatureStatus, string> = {
  pending: 'Pending',
  planned: 'Planned',
  in_progress: 'In Progress',
  done: 'Done',
  rejected: 'Rejected',
}

const STATUS_COLOR: Record<FeatureStatus, { bg: string; color: string; border: string }> = {
  pending:     { bg: 'var(--bg3)',                color: 'var(--text3)',  border: 'var(--border)' },
  planned:     { bg: 'rgba(91,163,245,.1)',        color: '#5ba3f5',       border: 'rgba(91,163,245,.25)' },
  in_progress: { bg: 'rgba(245,158,11,.1)',        color: 'var(--amber)',  border: 'rgba(245,158,11,.25)' },
  done:        { bg: 'rgba(34,197,94,.1)',         color: 'var(--green)',  border: 'rgba(34,197,94,.25)' },
  rejected:    { bg: 'rgba(239,68,68,.1)',         color: 'var(--red)',    border: 'rgba(239,68,68,.25)' },
}

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function FeedbackClient({
  currentUserId,
  isAdmin,
}: {
  currentUserId: string
  isAdmin: boolean
}) {
  const [requests, setRequests]       = useState<FeatureRequest[]>([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [tab, setTab]                 = useState<Tab>('all')
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [formError, setFormError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/feedback')
      if (res.ok) setRequests(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) { setFormError('Title and description are required.'); return }
    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      })
      if (!res.ok) { const d = await res.json(); setFormError(d.error ?? 'Failed to submit'); return }
      const newReq: FeatureRequest = await res.json()
      setRequests(r => [newReq, ...r])
      setTitle('')
      setDescription('')
      setShowForm(false)
    } catch {
      setFormError('Connection error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleVote(req: FeatureRequest) {
    const voted = req.votes.length > 0
    const method = voted ? 'DELETE' : 'POST'
    const res = await fetch(`/api/feedback/${req.id}/vote`, { method })
    if (res.ok) {
      setRequests(rs => rs.map(r => {
        if (r.id !== req.id) return r
        return {
          ...r,
          upvotes: r.upvotes + (voted ? -1 : 1),
          votes: voted ? [] : [{ id: 'local' }],
        }
      }))
    }
  }

  async function changeStatus(req: FeatureRequest, status: string) {
    const res = await fetch(`/api/feedback/${req.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated: FeatureRequest = await res.json()
      setRequests(rs => rs.map(r => r.id === req.id ? { ...r, ...updated } : r))
    }
  }

  const filtered = requests.filter(r => {
    if (tab === 'mine')    return r.userId === currentUserId
    if (tab === 'planned') return r.status === 'planned' || r.status === 'in_progress'
    if (tab === 'done')    return r.status === 'done'
    return true
  })

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all',     label: 'All' },
    { key: 'mine',    label: 'My Requests' },
    { key: 'planned', label: 'Planned' },
    { key: 'done',    label: 'Done' },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 10, color: 'var(--text)', fontSize: 14, padding: '11px 14px',
    fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
  }

  return (
    <>
      <style>{`
        .fr-input:focus { border-color: var(--amber) !important; box-shadow: 0 0 0 3px rgba(245,158,11,.13); }
        .fr-vote-btn:hover { opacity: 1 !important; }
        .fr-card:hover { border-color: var(--border2) !important; }
      `}</style>

      <div style={{ padding: '28px 28px 56px', maxWidth: 860 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
          <div>
            <h1 style={{
              fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: 0,
              fontFamily: 'var(--font-display)', letterSpacing: '-.3px', marginBottom: 4,
            }}>
              Feature Requests
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text4)', margin: 0 }}>Suggest and vote on features</p>
          </div>
          <button
            onClick={() => { setShowForm(s => !s); setFormError('') }}
            style={{
              background: 'var(--amber)', color: '#050810', border: 'none', borderRadius: 10,
              fontSize: 13, fontWeight: 800, padding: '10px 18px', cursor: 'pointer',
              fontFamily: 'var(--font-display, inherit)', letterSpacing: '.2px', flexShrink: 0,
            }}
          >
            {showForm ? '✕ Cancel' : '+ New Request'}
          </button>
        </div>

        {/* Inline form */}
        {showForm && (
          <div style={{
            background: 'var(--bg2)', border: '1px solid rgba(245,158,11,.3)',
            borderRadius: 14, padding: 24, marginBottom: 24,
          }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}>New Feature Request</h2>

            {formError && (
              <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
                {formError}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 7 }}>
                Title
              </label>
              <input
                className="fr-input"
                style={inputStyle}
                placeholder="Short, clear title for the feature"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={120}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 7 }}>
                Description
              </label>
              <textarea
                className="fr-input"
                style={{ ...inputStyle, minHeight: 100, resize: 'vertical', lineHeight: 1.55 }}
                placeholder="Describe the feature and why it would be valuable..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={2000}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSubmit}
                disabled={submitting || !title.trim() || !description.trim()}
                style={{
                  background: submitting || !title.trim() || !description.trim() ? 'var(--bg4)' : 'var(--amber)',
                  color: submitting || !title.trim() || !description.trim() ? 'var(--text4)' : '#050810',
                  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800,
                  padding: '11px 20px', cursor: submitting ? 'wait' : 'pointer',
                  fontFamily: 'var(--font-display, inherit)',
                }}
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
              <button
                onClick={() => { setShowForm(false); setFormError('') }}
                style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 600, padding: '11px 20px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
                background: tab === t.key ? 'var(--bg3)' : 'transparent',
                color: tab === t.key ? 'var(--text)' : 'var(--text4)',
                transition: 'all .15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', gap: 16 }}>
                <div style={{ width: 52, height: 52, background: 'var(--bg3)', borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 16, width: '60%', background: 'var(--bg3)', borderRadius: 6, marginBottom: 8 }} />
                  <div style={{ height: 12, width: '90%', background: 'var(--bg3)', borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text4)' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>💡</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>No feature requests yet</div>
            <div style={{ fontSize: 14 }}>
              {tab === 'all' ? 'Be the first to suggest one!' : 'No requests in this category yet.'}
            </div>
          </div>
        )}

        {/* Request cards */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(req => {
              const voted = req.votes.length > 0
              const sc = STATUS_COLOR[req.status] ?? STATUS_COLOR.pending
              return (
                <div
                  key={req.id}
                  className="fr-card"
                  style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 14, padding: 18, display: 'flex', gap: 14,
                    transition: 'border-color .15s ease',
                  }}
                >
                  {/* Vote button */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, width: 52 }}>
                    <button
                      className="fr-vote-btn"
                      onClick={() => void toggleVote(req)}
                      style={{
                        width: 52, height: 52, borderRadius: 10, border: `1px solid ${voted ? 'rgba(245,158,11,.35)' : 'var(--border)'}`,
                        background: voted ? 'rgba(245,158,11,.1)' : 'var(--bg3)',
                        color: voted ? 'var(--amber)' : 'var(--text3)',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 2,
                        fontSize: 12, fontWeight: 700, transition: 'all .15s ease',
                        opacity: .9,
                      }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>▲</span>
                      <span>{req.upvotes}</span>
                    </button>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{req.title}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                        background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                        letterSpacing: '.3px', textTransform: 'uppercase', flexShrink: 0,
                      }}>
                        {STATUS_LABEL[req.status]}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 13, color: 'var(--text3)', margin: '0 0 8px',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden', lineHeight: 1.55,
                    } as React.CSSProperties}>
                      {req.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', background: 'var(--amber)',
                        color: '#050810', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 800, flexShrink: 0,
                      }}>
                        {req.user.initials}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text4)' }}>{req.user.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text4)' }}>·</span>
                      <span style={{ fontSize: 12, color: 'var(--text4)' }}>{relativeDate(req.createdAt)}</span>

                      {/* Admin status dropdown */}
                      {isAdmin && (
                        <select
                          value={req.status}
                          onChange={e => void changeStatus(req, e.target.value)}
                          style={{
                            marginLeft: 'auto', background: 'var(--bg3)', border: '1px solid var(--border)',
                            borderRadius: 7, color: 'var(--text3)', fontSize: 11, padding: '3px 8px',
                            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="planned">Planned</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
