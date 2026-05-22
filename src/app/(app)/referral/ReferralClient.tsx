'use client'

import { useState, useTransition } from 'react'
import type { Role } from '@/generated/prisma/client'

// ── Reward tier definitions ────────────────────────────────────────────────────

const TIERS = [
  { threshold: 1,  label: '$25 account credit',  emoji: '💵', value: 25  },
  { threshold: 3,  label: '$100 account credit', emoji: '💰', value: 100 },
  { threshold: 5,  label: '1 month FREE',        emoji: '🎉', value: 150 },
  { threshold: 10, label: '2 months FREE',       emoji: '🏆', value: 300 },
]

function calcReward(conversions: number): number {
  let reward = 0
  for (const tier of TIERS) {
    if (conversions >= tier.threshold) reward = tier.value
  }
  return reward
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  code: string
  link: string
  uses: number
  conversions: number
  role: Role
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ReferralClient({ code, link: initialLink, uses, conversions, role }: Props) {
  const [copied, setCopied]           = useState(false)
  const [currentLink, setCurrentLink] = useState(initialLink)
  const [currentCode, setCurrentCode] = useState(code)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [isPending, startTransition]  = useTransition()
  const [regenError, setRegenError]   = useState('')

  const isAdmin = role === 'admin' || role === 'superadmin'
  const rewardValue = calcReward(conversions)

  // Next tier progress
  const nextTier = TIERS.find(t => conversions < t.threshold)
  const prevTierThreshold = nextTier
    ? (TIERS[TIERS.indexOf(nextTier) - 1]?.threshold ?? 0)
    : TIERS[TIERS.length - 1].threshold
  const progressPct = nextTier
    ? Math.round(((conversions - prevTierThreshold) / (nextTier.threshold - prevTierThreshold)) * 100)
    : 100

  function copyLink() {
    navigator.clipboard.writeText(currentLink).catch(() => {
      // Fallback for environments without clipboard API
      const el = document.createElement('textarea')
      el.value = currentLink
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Hey! I use WorkForge for field service management and it's been a game-changer for our business. Try it free using my referral link: ${currentLink}`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  function shareEmail() {
    const subject = encodeURIComponent('Try WorkForge — Field Service Management')
    const body = encodeURIComponent(
      `Hi,\n\nI've been using WorkForge to manage our field service operations and it's made a huge difference — job tracking, invoicing, scheduling and more all in one place.\n\nIf you sign up using my referral link, we both benefit:\n${currentLink}\n\nHope it helps!\nBest,`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  function regenerate() {
    setRegenError('')
    startTransition(async () => {
      try {
        const res = await fetch('/api/referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'regenerate' }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed')
        setCurrentCode(data.code)
        setCurrentLink(data.link)
        setConfirmRegen(false)
      } catch (err) {
        setRegenError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 60px' }}>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,.12) 0%, rgba(245,158,11,.04) 100%)',
        border: '1px solid rgba(245,158,11,.25)',
        borderRadius: 20,
        padding: '40px 36px 36px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(245,158,11,.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ fontSize: 36, marginBottom: 6 }}>🎁</div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 36,
          fontWeight: 800,
          color: 'var(--text)',
          margin: '0 0 10px',
          letterSpacing: '-1px',
        }}>
          Grow Together
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text3)', margin: '0 0 28px', maxWidth: 560, lineHeight: 1.6 }}>
          Refer a fellow service business and earn rewards when they join WorkForge. The more you share, the more you earn.
        </p>

        {/* Referral link input */}
        <div style={{
          display: 'flex', gap: 10, flexWrap: 'wrap',
          marginBottom: 20,
        }}>
          <div style={{
            flex: 1, minWidth: 240,
            display: 'flex', alignItems: 'center',
            background: 'var(--bg3)',
            border: '1.5px solid var(--border)',
            borderRadius: 12,
            padding: '0 16px',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--text3)',
            overflow: 'hidden',
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, padding: '14px 0' }}>
              {currentLink}
            </span>
          </div>
          <button
            onClick={copyLink}
            style={{
              padding: '0 24px',
              height: 50,
              background: copied ? 'var(--green)' : 'var(--amber)',
              color: '#060a17',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background .2s ease, transform .1s ease',
              transform: copied ? 'scale(.97)' : 'scale(1)',
              letterSpacing: '.2px',
            }}
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Share row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={shareWhatsApp}
            style={shareButtonStyle('#25d366')}
          >
            <span style={{ fontSize: 16 }}>💬</span> WhatsApp
          </button>
          <button
            onClick={shareEmail}
            style={shareButtonStyle('var(--amber)')}
          >
            <span style={{ fontSize: 16 }}>✉️</span> Email
          </button>
          <button
            onClick={copyLink}
            style={shareButtonStyle('var(--purple)')}
          >
            <span style={{ fontSize: 16 }}>🔗</span> {copied ? 'Copied!' : 'Share Link'}
          </button>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          {
            icon: '👥',
            label: 'Referrals Sent',
            value: String(uses),
            color: 'var(--text)',
          },
          {
            icon: '✅',
            label: 'Converted',
            value: String(conversions),
            color: 'var(--amber)',
          },
          {
            icon: '🎁',
            label: 'Rewards Earned',
            value: `$${rewardValue}`,
            color: 'var(--green)',
          },
        ].map(card => (
          <div key={card.label} style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '24px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{card.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: card.color, fontFamily: 'var(--font-display)', letterSpacing: '-1px', marginBottom: 4 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.8px' }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Reward tiers ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '28px 24px',
        marginBottom: 28,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px', fontFamily: 'var(--font-display)' }}>
          Your Rewards
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text4)', margin: '0 0 24px' }}>
          Every conversion moves you closer to the next tier
        </p>

        {/* Progress bar */}
        {nextTier && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text4)', fontWeight: 600 }}>
                {conversions} / {nextTier.threshold} conversions to {nextTier.label}
              </span>
              <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700 }}>{progressPct}%</span>
            </div>
            <div style={{
              height: 8, background: 'var(--bg3)', borderRadius: 100, overflow: 'hidden',
            }}>
              <div style={{
                width: `${progressPct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--amber) 0%, #fbbf24 100%)',
                borderRadius: 100,
                transition: 'width .6s cubic-bezier(.34,1.56,.64,1)',
                boxShadow: '0 0 8px rgba(245,158,11,.5)',
              }} />
            </div>
          </div>
        )}

        {/* Tier cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
          {TIERS.map(tier => {
            const achieved = conversions >= tier.threshold
            const isCurrent = !achieved && nextTier?.threshold === tier.threshold
            return (
              <div
                key={tier.threshold}
                style={{
                  border: `1px solid ${achieved ? 'var(--amber)' : isCurrent ? 'rgba(245,158,11,.4)' : 'var(--border)'}`,
                  borderRadius: 14,
                  padding: '20px',
                  background: achieved
                    ? 'rgba(245,158,11,.07)'
                    : isCurrent
                      ? 'rgba(245,158,11,.03)'
                      : 'transparent',
                  opacity: achieved || isCurrent ? 1 : 0.55,
                  transition: 'all .2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {achieved && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--green)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: '#fff', fontWeight: 800,
                    boxShadow: '0 0 10px rgba(34,197,94,.4)',
                  }}>✓</div>
                )}
                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    fontSize: 10, fontWeight: 700, color: 'var(--amber)',
                    background: 'rgba(245,158,11,.15)',
                    padding: '3px 8px', borderRadius: 20,
                    border: '1px solid rgba(245,158,11,.3)',
                  }}>Next up</div>
                )}
                <div style={{ fontSize: 24, marginBottom: 8 }}>{tier.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 4 }}>
                  {tier.threshold} {tier.threshold === 1 ? 'referral' : 'referrals'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: achieved ? 'var(--amber)' : 'var(--text)', letterSpacing: '-.3px', fontFamily: 'var(--font-display)' }}>
                  {tier.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '28px 24px',
        marginBottom: isAdmin ? 28 : 0,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 24px', fontFamily: 'var(--font-display)' }}>
          How It Works
        </h2>
        <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
          {/* Connecting line */}
          <div style={{
            position: 'absolute',
            top: 20, left: 24, right: 24,
            height: 2,
            background: 'linear-gradient(90deg, var(--amber) 0%, rgba(245,158,11,.2) 100%)',
            zIndex: 0,
          }} />
          {[
            { step: '1', title: 'Share your link', desc: 'Copy your unique referral link and send it to fellow field service business owners.' },
            { step: '2', title: 'They sign up',    desc: 'Your contact clicks the link, signs up for WorkForge, and starts their free trial.' },
            { step: '3', title: 'Earn rewards',    desc: 'Once they convert to a paid plan, you unlock account credits or free months.' },
          ].map(s => (
            <div key={s.step} style={{ flex: 1, textAlign: 'center', padding: '0 16px', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 40, height: 40,
                borderRadius: '50%',
                background: 'var(--amber)',
                color: '#060a17',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 900,
                margin: '0 auto 14px',
                boxShadow: '0 0 0 4px var(--bg2), 0 0 0 6px rgba(245,158,11,.25)',
              }}>
                {s.step}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Regenerate link (admin only) ──────────────────────────────────── */}
      {isAdmin && (
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)' }}>
              Current code: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>{currentCode}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4 }}>
              Regenerating will permanently invalidate your current link and reset all usage stats.
            </div>
          </div>
          {!confirmRegen ? (
            <button
              onClick={() => setConfirmRegen(true)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text4)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Regenerate link
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {regenError && <span style={{ fontSize: 11, color: 'var(--red)' }}>{regenError}</span>}
              <button
                onClick={() => setConfirmRegen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text3)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={regenerate}
                disabled={isPending}
                style={{
                  background: 'var(--red-dim)',
                  border: '1px solid var(--red)',
                  borderRadius: 10,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--red)',
                  cursor: isPending ? 'wait' : 'pointer',
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                {isPending ? 'Regenerating…' : 'Yes, regenerate'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function shareButtonStyle(accentColor: string): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '10px 18px',
    background: 'var(--bg3)',
    border: `1px solid var(--border)`,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text2)',
    cursor: 'pointer',
    transition: 'all .15s ease',
  }
}
