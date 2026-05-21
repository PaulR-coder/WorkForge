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
    : initialAction === 'approve' ? null  // will trigger on mount via useEffect? No — keep clean
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
      // network error — keep loading state to show user something happened
    } finally {
      setLoading(null)
    }
  }

  // If we have an initialAction from the email link query param, auto-trigger
  // We show the page first so the client sees what they're approving
  // (don't auto-submit — let them review and click)

  const lineItems: LineItem[] = Array.isArray(estimate.lineItems) ? estimate.lineItems : []

  if (result === 'approved') {
    return (
      <div style={{ minHeight: '100vh', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#15803d', marginBottom: 8 }}>Estimate Approved!</h1>
          <p style={{ fontSize: 15, color: '#166534', lineHeight: 1.6, marginBottom: 24 }}>
            Thank you, {estimate.client}. We've received your approval for <strong>{estimate.number}</strong>.
            Our team will be in touch shortly to schedule your {estimate.jobType || 'service'}.
          </p>
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 12, padding: '16px 20px', fontSize: 13, color: '#166534' }}>
            <strong>{companyName}</strong> will contact you soon to confirm scheduling details.
          </div>
        </div>
      </div>
    )
  }

  if (result === 'declined') {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>👍</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#475569', marginBottom: 8 }}>Got it, no problem.</h1>
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6 }}>
            We've noted your decision on estimate <strong>{estimate.number}</strong>.
            Feel free to reach out if you have any questions or would like to discuss alternatives.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: '#f59e0b', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#080c1a', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, opacity: .7 }}>
            Service Estimate
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#080c1a' }}>{companyName}</div>
          <div style={{ fontSize: 13, color: '#1a1a2e', marginTop: 4, opacity: .75 }}>{estimate.number}</div>
        </div>

        {/* Estimate details */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>
            Prepared for
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>{estimate.client}</div>

          {estimate.jobType && (
            <div style={{ display: 'inline-block', background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, marginBottom: 12 }}>
              {estimate.jobType}
            </div>
          )}

          {estimate.description && (
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, marginBottom: 0, background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
              {estimate.description}
            </p>
          )}
        </div>

        {/* Line items */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr auto', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .4 }}>
            <span>Description</span><span>Amount</span>
          </div>
          {lineItems.map((item, i) => (
            <div key={item.id ?? i} style={{ padding: '12px 20px', borderBottom: i < lineItems.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.description}</div>
                {(item.hours || item.qty) && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {item.hours ? `${item.hours} hr${item.hours !== 1 ? 's' : ''} × $${item.unitPrice}/hr` : ''}
                    {item.qty ? `Qty ${item.qty} × $${item.unitPrice}` : ''}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>${item.total.toFixed(2)}</div>
            </div>
          ))}
          <div style={{ padding: '14px 20px', background: '#f0fdf4', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#15803d' }}>Total</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>${estimate.subtotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => act('approve')}
            disabled={!!loading}
            style={{
              flex: 1, padding: '16px 0', background: loading === 'approve' ? '#16a34a99' : '#16a34a',
              color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800,
              cursor: loading ? 'wait' : 'pointer', transition: 'background 140ms',
            }}
          >
            {loading === 'approve' ? 'Approving…' : '✓ Approve Estimate'}
          </button>
          <button
            onClick={() => act('decline')}
            disabled={!!loading}
            style={{
              padding: '16px 20px', background: '#f1f5f9', color: '#64748b',
              border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading === 'decline' ? '…' : 'Decline'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 20 }}>
          By approving, you authorize {companyName} to proceed with the described work.
        </p>
      </div>
    </div>
  )
}
