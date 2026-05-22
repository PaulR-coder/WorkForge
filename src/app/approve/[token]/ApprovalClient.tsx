'use client'

import { useState } from 'react'

type LineItem = { id?: string; description: string; hours?: number; qty?: number; unitPrice: number; total: number }

type EstimateData = {
  id: string
  number: string
  client: string
  jobType: string
  description: string
  lineItems: LineItem[]
  subtotal: number
  status: string
  createdBy: { company: string }
}

function CheckIcon({ size = 36, color = '#16a34a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
}

function ThumbsDownIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
    </svg>
  )
}

function ClockExpiredIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  )
}

function SearchMissIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  )
}

export default function ApprovalClient({
  token,
  estimate,
  initialAction,
}: {
  token: string
  estimate: EstimateData
  initialAction?: 'approve' | 'decline'
}) {
  const [result, setResult] = useState<'approved' | 'declined' | null>(
    estimate.status === 'approved' ? 'approved'
    : estimate.status === 'declined' ? 'declined'
    : initialAction === 'approve' ? null
    : null
  )
  const [loading, setLoading] = useState<'approve' | 'decline' | null>(null)

  const companyName = estimate.createdBy?.company || 'WorkForge'

  async function act(action: 'approve' | 'decline') {
    if (loading || result) return
    setLoading(action)
    try {
      const res = await fetch(`/api/estimate-approval/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (res.ok) setResult(data.status)
    } catch {
      // network error
    } finally {
      setLoading(null)
    }
  }

  const lineItems: LineItem[] = Array.isArray(estimate.lineItems) ? estimate.lineItems : []

  // — Approved state —
  if (result === 'approved') {
    return (
      <div style={{
        minHeight: '100vh', background: '#f0fdf4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          {/* Icon */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: '#dcfce7', border: '2px solid #86efac',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
          }}>
            <CheckIcon size={40} color="#16a34a" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#15803d', marginBottom: 10, letterSpacing: -.3 }}>
            Estimate Approved!
          </h1>
          <p style={{ fontSize: 15, color: '#166534', lineHeight: 1.7, marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
            Thank you, <strong>{estimate.client}</strong>. We&apos;ve received your approval for estimate <strong>{estimate.number}</strong>.
            Our team will be in touch shortly to schedule your {estimate.jobType || 'service'}.
          </p>
          <div style={{
            background: '#dcfce7', border: '1px solid #86efac',
            borderRadius: 14, padding: '16px 22px',
            fontSize: 14, color: '#166534', lineHeight: 1.6,
          }}>
            <strong>{companyName}</strong> will contact you soon to confirm scheduling details.
          </div>
        </div>
      </div>
    )
  }

  // — Declined state —
  if (result === 'declined') {
    return (
      <div style={{
        minHeight: '100vh', background: '#f8fafc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: '#f1f5f9', border: '2px solid #cbd5e1',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
          }}>
            <ThumbsDownIcon />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#475569', marginBottom: 10, letterSpacing: -.3 }}>
            Got it, no problem.
          </h1>
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7 }}>
            We&apos;ve noted your decision on estimate <strong>{estimate.number}</strong>.
            Feel free to reach out if you have any questions or would like to discuss alternatives.
          </p>
        </div>
      </div>
    )
  }

  // — Main estimate view —
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '0 0 48px',
    }}>
      {/* Top amber header bar */}
      <div style={{
        background: '#f59e0b',
        padding: '28px 24px 24px',
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(8,12,26,.6)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 5 }}>
            Service Estimate
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#080c1a', letterSpacing: -.3, marginBottom: 3 }}>
            {companyName}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(8,12,26,.65)', fontWeight: 500 }}>
            {estimate.number}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px' }}>

        {/* Client + job info card */}
        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: '22px 24px',
          marginTop: 20, marginBottom: 14,
          boxShadow: '0 1px 4px rgba(0,0,0,.06)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 5 }}>
            Prepared for
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 14, letterSpacing: -.2 }}>
            {estimate.client}
          </div>

          {estimate.jobType && (
            <span style={{
              display: 'inline-block',
              background: '#fef3c7', color: '#92400e',
              fontSize: 11, fontWeight: 700, padding: '4px 12px',
              borderRadius: 20, marginBottom: estimate.description ? 14 : 0,
              border: '1px solid #fde68a',
            }}>
              {estimate.jobType}
            </span>
          )}

          {estimate.description && (
            <p style={{
              fontSize: 14, color: '#475569', lineHeight: 1.75,
              margin: 0, background: '#f8fafc',
              borderRadius: 10, padding: '12px 16px',
              border: '1px solid #f1f5f9',
            }}>
              {estimate.description}
            </p>
          )}
        </div>

        {/* Line items table */}
        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 16, overflow: 'hidden',
          marginBottom: 22,
          boxShadow: '0 1px 4px rgba(0,0,0,.06)',
        }}>
          {/* Table header */}
          <div style={{
            padding: '11px 22px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'grid', gridTemplateColumns: '1fr auto',
            fontSize: 11, fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: .5,
          }}>
            <span>Description</span>
            <span>Amount</span>
          </div>

          {lineItems.map((item, i) => (
            <div
              key={item.id ?? i}
              style={{
                padding: '14px 22px',
                borderBottom: i < lineItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                display: 'grid', gridTemplateColumns: '1fr auto',
                alignItems: 'center', gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>
                  {item.description}
                </div>
                {(item.hours || item.qty) && (
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {item.hours ? `${item.hours} hr${item.hours !== 1 ? 's' : ''} × $${item.unitPrice}/hr` : ''}
                    {item.qty ? `Qty ${item.qty} × $${item.unitPrice}` : ''}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
                ${item.total.toFixed(2)}
              </div>
            </div>
          ))}

          {/* Total row */}
          <div style={{
            padding: '16px 22px',
            background: '#f0fdf4',
            display: 'grid', gridTemplateColumns: '1fr auto',
            alignItems: 'center',
            borderTop: '2px solid #dcfce7',
          }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#15803d' }}>Total</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
              ${estimate.subtotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => act('approve')}
            disabled={!!loading}
            style={{
              width: '100%', minHeight: 56,
              background: loading === 'approve' ? '#15803d' : '#16a34a',
              color: '#fff', border: 'none', borderRadius: 14,
              fontSize: 17, fontWeight: 800,
              cursor: loading ? 'wait' : 'pointer',
              transition: 'background 140ms',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 4px 14px rgba(22,163,74,.3)',
              letterSpacing: .2,
            }}
          >
            {loading === 'approve' ? (
              <>
                <span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                Approving…
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Approve Estimate
              </>
            )}
          </button>

          <button
            onClick={() => act('decline')}
            disabled={!!loading}
            style={{
              width: '100%', minHeight: 50,
              background: '#fff', color: '#64748b',
              border: '1.5px solid #e2e8f0', borderRadius: 14,
              fontSize: 15, fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              transition: 'border-color 140ms',
            }}
          >
            {loading === 'decline' ? 'Declining…' : 'Decline'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 22, lineHeight: 1.6 }}>
          By approving, you authorize {companyName} to proceed with the described work at the stated price.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// Standalone error components for page.tsx to use
export function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: '#f1f5f9', border: '2px solid #e2e8f0',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <SearchMissIcon />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 10 }}>Link not found</h1>
        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>
          This estimate link is invalid or has already been used. Please contact the company directly.
        </p>
      </div>
    </div>
  )
}

export function ExpiredPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#fffbeb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: '#fef3c7', border: '2px solid #fde68a',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <ClockExpiredIcon />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#92400e', marginBottom: 10 }}>Link expired</h1>
        <p style={{ fontSize: 14, color: '#78350f', lineHeight: 1.7 }}>
          This estimate link has expired. Please contact the company to request a new one.
        </p>
      </div>
    </div>
  )
}
