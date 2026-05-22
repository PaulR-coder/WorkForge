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

  const [showDisclosure, setShowDisclosure] = useState(false)
  const [disclosureAccepted, setDisclosureAccepted] = useState(false)

  function handleSubscribeClick() {
    setShowDisclosure(true)
  }

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
      {/* Header */}
      <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: '.5px', marginBottom: 3 }}>Billing</h1>
      <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 24 }}>{tenantName}</div>

      {/* Success banner */}
      {justSubscribed && (
        <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.25)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(34,197,94,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>You&apos;re subscribed!</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>WorkForge Pro is now active on your account.</div>
          </div>
        </div>
      )}

      {/* Status card */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>Current Plan</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: '.5px', marginBottom: 5 }}>WorkForge Pro</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>$39/mo base + $12/user/mo · All features included</div>
          </div>
          {/* Status badge pill */}
          <span style={{
            fontSize: 11, fontWeight: 700, color: st.color, background: st.bg,
            border: `1px solid ${st.border}`, borderRadius: 20, padding: '5px 13px', flexShrink: 0,
          }}>
            {st.label}
          </span>
        </div>

        {/* Trial countdown */}
        {subscriptionStatus === 'trialing' && trialDaysLeft !== null && (
          <div style={{ marginTop: 18, padding: '11px 15px', background: 'rgba(91,163,245,.07)', border: '1px solid rgba(91,163,245,.18)', borderRadius: 9 }}>
            <div style={{ fontSize: 13, color: '#5ba3f5', fontWeight: 700 }}>
              {trialDaysLeft > 0
                ? `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left in your free trial`
                : 'Your free trial has ended'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 3 }}>Subscribe to keep access to all WorkForge features</div>
          </div>
        )}

        {/* Past due */}
        {subscriptionStatus === 'past_due' && (
          <div style={{ marginTop: 18, padding: '11px 15px', background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.18)', borderRadius: 9 }}>
            <div style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 700 }}>Payment failed — please update your payment method</div>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 3 }}>Your account will be suspended if not resolved</div>
          </div>
        )}

        {/* Renewal footer */}
        {renewDate && subscriptionStatus === 'active' && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text4)' }}>
            Renews on {renewDate}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(subscriptionStatus === 'trialing' || subscriptionStatus === 'cancelled') && (
            <button
              onClick={handleSubscribeClick}
              disabled={loading !== null}
              style={{ padding: '11px 24px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading === 'checkout' ? 'Redirecting…' : 'Subscribe — from $39/mo'}
            </button>
          )}
          {hasStripeCustomer && subscriptionStatus !== 'trialing' && (
            <button
              onClick={openPortal}
              disabled={loading !== null}
              style={{ padding: '11px 22px', background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading === 'portal' ? 'Opening…' : 'Manage billing'}
            </button>
          )}
          {subscriptionStatus === 'past_due' && (
            <button
              onClick={openPortal}
              disabled={loading !== null}
              style={{ padding: '11px 24px', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading === 'portal' ? 'Opening…' : 'Update payment method'}
            </button>
          )}
        </div>
      </div>

      {/* Plan features */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 16 }}>What&apos;s included</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {PLANS.pro.features.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(34,197,94,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription disclosure modal — FTC Negative Option Rule & CA ARL compliance */}
      {showDisclosure && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16,
            padding: '0 0 24px', maxWidth: 440, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,.5)',
            overflow: 'hidden',
          }}>
            {/* Amber top accent border */}
            <div style={{ height: 3, background: 'var(--amber)', borderRadius: '16px 16px 0 0' }} />
            <div style={{ padding: '22px 28px 0' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>Subscription Terms</div>

              <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '15px 17px', marginBottom: 18, fontSize: 13, color: 'var(--text3)', lineHeight: 1.7 }}>
                <div style={{ marginBottom: 8 }}><strong style={{ color: 'var(--text)' }}>Billing:</strong> $39/mo base + $12/mo per active user</div>
                <div style={{ marginBottom: 8 }}><strong style={{ color: 'var(--text)' }}>Renewal:</strong> Automatically renews monthly until cancelled</div>
                <div style={{ marginBottom: 8 }}><strong style={{ color: 'var(--text)' }}>Cancellation:</strong> Cancel anytime from Billing → Manage billing. No penalty. Access continues through the end of the paid period.</div>
                <div><strong style={{ color: 'var(--text)' }}>First charge:</strong> Immediately upon subscribing</div>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
                <input
                  type="checkbox"
                  checked={disclosureAccepted}
                  onChange={e => setDisclosureAccepted(e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                  I understand that WorkForge Pro automatically renews monthly and I authorize recurring charges until I cancel. I agree to the{' '}
                  <a href="/terms" target="_blank" style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 700 }}>Terms of Service</a>.
                </span>
              </label>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setShowDisclosure(false); setDisclosureAccepted(false) }}
                  style={{ flex: 1, padding: '11px 0', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, fontWeight: 700, color: 'var(--text3)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowDisclosure(false); startCheckout() }}
                  disabled={!disclosureAccepted || loading !== null}
                  style={{ flex: 1, padding: '11px 0', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: !disclosureAccepted ? 'not-allowed' : 'pointer', opacity: !disclosureAccepted ? 0.5 : 1 }}
                >
                  Continue to Payment →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
