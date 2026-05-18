'use client'

import { useState } from 'react'
import { PLANS } from '@/lib/stripe'
import { useSearchParams } from 'next/navigation'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  trialing:  { label: 'Free Trial',    color: '#5ba3f5',       bg: 'rgba(91,163,245,.1)',   border: 'rgba(91,163,245,.25)'  },
  active:    { label: 'Active',        color: 'var(--green)',  bg: 'rgba(34,197,94,.1)',    border: 'rgba(34,197,94,.25)'   },
  past_due:  { label: 'Payment Due',   color: 'var(--amber)',  bg: 'rgba(245,158,11,.1)',   border: 'rgba(245,158,11,.25)'  },
  cancelled: { label: 'Cancelled',     color: 'var(--red)',    bg: 'rgba(239,68,68,.1)',    border: 'rgba(239,68,68,.25)'   },
  unpaid:    { label: 'Unpaid',        color: 'var(--red)',    bg: 'rgba(239,68,68,.1)',    border: 'rgba(239,68,68,.25)'   },
}

export default function BillingClient({
  tenantName,
  subscriptionStatus,
  trialEndsAt,
  currentPeriodEnd,
  hasStripeCustomer,
  hasSubscription,
}: {
  tenantName: string
  subscriptionStatus: string
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  hasStripeCustomer: boolean
  hasSubscription: boolean
}) {
  const [loading, setLoading] = useState<'checkout' | 'portal' | null>(null)
  const params = useSearchParams()
  const justSubscribed = params.get('success') === '1'

  const st = STATUS_CONFIG[subscriptionStatus] ?? STATUS_CONFIG.trialing

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : null

  const renewDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  async function startCheckout() {
    setLoading('checkout')
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(null)
    }
  }

  async function openPortal() {
    setLoading('portal')
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Billing</h1>
      <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 24 }}>{tenantName}</div>

      {justSubscribed && (
        <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🎉</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>You're subscribed!</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>WorkForge Pro is now active on your account.</div>
          </div>
        </div>
      )}

      {/* Status card */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Current Plan</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>WorkForge Pro</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>$49 / month · All features included</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 20, padding: '4px 12px', flexShrink: 0 }}>
            {st.label}
          </span>
        </div>

        {subscriptionStatus === 'trialing' && trialDaysLeft !== null && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(91,163,245,.08)', border: '1px solid rgba(91,163,245,.2)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#5ba3f5', fontWeight: 600 }}>
              {trialDaysLeft > 0
                ? `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left in your free trial`
                : 'Your free trial has ended'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 3 }}>Subscribe to keep access to all WorkForge features</div>
          </div>
        )}

        {subscriptionStatus === 'past_due' && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}>Payment failed — please update your payment method</div>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 3 }}>Your account will be suspended if not resolved</div>
          </div>
        )}

        {renewDate && subscriptionStatus === 'active' && (
          <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text4)' }}>
            Renews on {renewDate}
          </div>
        )}

        <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(subscriptionStatus === 'trialing' || subscriptionStatus === 'cancelled') && (
            <button
              onClick={startCheckout}
              disabled={loading !== null}
              style={{ padding: '11px 22px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading === 'checkout' ? 'Redirecting…' : 'Subscribe — $49/mo'}
            </button>
          )}
          {hasStripeCustomer && subscriptionStatus !== 'trialing' && (
            <button
              onClick={openPortal}
              disabled={loading !== null}
              style={{ padding: '11px 22px', background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading === 'portal' ? 'Opening…' : 'Manage billing'}
            </button>
          )}
          {subscriptionStatus === 'past_due' && (
            <button
              onClick={openPortal}
              disabled={loading !== null}
              style={{ padding: '11px 22px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading === 'portal' ? 'Opening…' : 'Update payment method'}
            </button>
          )}
        </div>
      </div>

      {/* Plan features */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>What's included</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PLANS.pro.features.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(34,197,94,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: 'var(--green)' }}>✓</span>
              </div>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
