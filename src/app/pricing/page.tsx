import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing — WorkForge Field Service Software',
  description: 'Simple, transparent pricing for field service teams. Start with a 14-day free trial. No credit card required.',
  openGraph: {
    title: 'Pricing — WorkForge Field Service Software',
    description: 'Simple, transparent pricing for field service teams. Start with a 14-day free trial. No credit card required.',
    url: 'https://getworkforge.com/pricing',
    siteName: 'WorkForge',
    type: 'website',
  },
}

// ── Bolt SVG path shared across logo instances ─────────────────────────────
const BOLT_PATH = 'M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z'

// ── Green checkmark for feature lists ─────────────────────────────────────
function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <circle cx="8" cy="8" r="7.5" fill="rgba(34,197,94,.13)" stroke="rgba(34,197,94,.3)" />
      <path
        d="M4.5 8.5l2.5 2.5 4.5-5"
        stroke="var(--green)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Individual feature row ─────────────────────────────────────────────────
function Feature({ text }: { text: string }) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        fontSize: 14,
        color: 'var(--text2)',
        lineHeight: 1.5,
        listStyle: 'none',
      }}
    >
      <Check />
      <span>{text}</span>
    </li>
  )
}

// ── FAQ item (static, no JS expand/collapse needed for Server Component) ───
function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div
      style={{
        padding: '22px 28px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <p
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 8,
          fontFamily: 'var(--font-display)',
          letterSpacing: '.01em',
          textTransform: 'uppercase',
        }}
      >
        {q}
      </p>
      <p style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.65 }}>{a}</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
export default function PricingPage() {
  return (
    <>
      {/* ── Google Fonts (same as landing page) ─────────────────────────── */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* ── Scoped styles ────────────────────────────────────────────────── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-body, 'DM Sans', system-ui, sans-serif);
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }

        /* ── Animations ──────────────────────────────────────────────────── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%,100% { opacity: .28; }
          50%      { opacity: .46; }
        }
        @keyframes gridPulse {
          0%,100% { opacity: .035; }
          50%      { opacity: .065; }
        }

        /* ── Nav ─────────────────────────────────────────────────────────── */
        .pr-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          height: 64px;
          background: rgba(6,10,23,.88);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border);
        }
        .pr-nav-left  { display: flex; align-items: center; gap: 20px; }
        .pr-nav-right { display: flex; align-items: center; gap: 8px; }

        .pr-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
        }
        .pr-logo-mark {
          width: 34px;
          height: 34px;
          background: var(--amber);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 18px rgba(245,158,11,.3);
        }
        .pr-logo-text {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          color: var(--text);
        }
        .pr-logo-text span { color: var(--amber); }

        .pr-back-link {
          font-size: 13px;
          font-weight: 500;
          color: var(--text3);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          transition: color .15s, border-color .15s, background .15s;
        }
        .pr-back-link:hover {
          color: var(--text);
          border-color: rgba(255,255,255,.18);
          background: var(--bg3, #111827);
        }

        .pr-nav-link {
          font-size: 13px;
          font-weight: 500;
          color: var(--text3);
          text-decoration: none;
          padding: 7px 14px;
          border-radius: 8px;
          transition: color .15s, background .15s;
        }
        .pr-nav-link:hover { color: var(--text); background: var(--bg3, #111827); }

        .pr-nav-cta {
          font-size: 13px;
          font-weight: 700;
          color: #080c1a;
          text-decoration: none;
          padding: 8px 18px;
          border-radius: 8px;
          background: var(--amber);
          transition: opacity .15s, transform .15s, box-shadow .15s;
          box-shadow: 0 2px 12px rgba(245,158,11,.25);
        }
        .pr-nav-cta:hover {
          opacity: .92;
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(245,158,11,.4);
        }

        /* ── Hero ────────────────────────────────────────────────────────── */
        .pr-hero {
          position: relative;
          overflow: hidden;
          text-align: center;
          padding: 88px 24px 72px;
        }
        .pr-hero-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: gridPulse 5s ease infinite;
          pointer-events: none;
        }
        .pr-hero-glow {
          position: absolute;
          top: 10%;
          left: 50%;
          transform: translateX(-50%);
          width: 640px;
          height: 360px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(245,158,11,.15) 0%, transparent 68%);
          animation: glowPulse 4s ease infinite;
          pointer-events: none;
        }
        .pr-hero-inner {
          position: relative;
          z-index: 1;
          max-width: 620px;
          margin: 0 auto;
        }
        .pr-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          border-radius: 100px;
          border: 1px solid var(--amber-border, rgba(245,158,11,.28));
          background: var(--amber-dim, rgba(245,158,11,.13));
          font-size: 11px;
          font-weight: 700;
          color: var(--amber);
          letter-spacing: .08em;
          text-transform: uppercase;
          margin-bottom: 24px;
          animation: fadeUp .5s ease both;
        }
        .pr-headline {
          font-family: var(--font-display);
          font-size: clamp(46px, 7vw, 72px);
          font-weight: 800;
          line-height: .95;
          letter-spacing: -.01em;
          text-transform: uppercase;
          color: var(--text);
          margin-bottom: 18px;
          animation: fadeUp .5s ease .08s both;
        }
        .pr-headline-accent { color: var(--amber); }
        .pr-subtitle {
          font-size: 16px;
          color: var(--text3);
          line-height: 1.65;
          animation: fadeUp .5s ease .15s both;
        }

        /* ── Pricing grid ────────────────────────────────────────────────── */
        .pr-section {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 24px 96px;
        }

        .pr-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          align-items: start;
          max-width: 800px;
          margin: 0 auto;
          animation: fadeUp .5s ease .2s both;
        }

        .pr-card {
          position: relative;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-top: 3px solid var(--border);
          border-radius: 18px;
          padding: 32px 28px 28px;
          display: flex;
          flex-direction: column;
          gap: 0;
          transition: border-color .2s, box-shadow .2s, transform .2s;
        }
        .pr-card:hover {
          border-color: rgba(255,255,255,.15);
          box-shadow: 0 12px 40px rgba(0,0,0,.4);
          transform: translateY(-2px);
        }
        .pr-card-pro {
          border-top: 3px solid var(--amber) !important;
          box-shadow: 0 0 0 1px rgba(245,158,11,.15), 0 8px 32px rgba(245,158,11,.1);
        }
        .pr-card-pro:hover {
          box-shadow: 0 0 0 1px rgba(245,158,11,.25), 0 16px 48px rgba(245,158,11,.18);
          border-color: rgba(245,158,11,.2) !important;
        }

        /* Most Popular badge */
        .pr-popular-badge {
          position: absolute;
          top: -1px;
          right: 22px;
          transform: translateY(-100%);
          background: var(--amber);
          color: #080c1a;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          padding: 5px 12px 6px;
          border-radius: 6px 6px 0 0;
        }

        .pr-tier-label {
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--text4);
          margin-bottom: 4px;
        }
        .pr-tier-name {
          font-family: var(--font-display);
          font-size: 26px;
          font-weight: 800;
          letter-spacing: .02em;
          text-transform: uppercase;
          color: var(--text);
          margin-bottom: 16px;
        }

        .pr-price-block {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-bottom: 6px;
        }
        .pr-price-currency {
          font-family: var(--font-mono);
          font-size: 22px;
          font-weight: 500;
          color: var(--text3);
        }
        .pr-price-amount {
          font-family: var(--font-mono);
          font-size: 48px;
          font-weight: 500;
          color: var(--text);
          line-height: 1;
          letter-spacing: -.02em;
        }
        .pr-price-period {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--text4);
          margin-left: 2px;
        }
        .pr-price-custom {
          font-family: var(--font-mono);
          font-size: 32px;
          font-weight: 500;
          color: var(--text);
          line-height: 1;
          letter-spacing: -.01em;
        }

        .pr-price-desc {
          font-size: 13px;
          color: var(--text4);
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .pr-divider {
          height: 1px;
          background: var(--border);
          margin-bottom: 20px;
        }

        .pr-features-list {
          display: flex;
          flex-direction: column;
          gap: 11px;
          margin-bottom: 28px;
          padding: 0;
          flex: 1;
        }

        /* CTA buttons */
        .pr-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          width: 100%;
          padding: 13px 20px;
          border-radius: 10px;
          font-family: var(--font-body, system-ui);
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: opacity .15s, transform .15s, box-shadow .15s, background .15s, border-color .15s;
          letter-spacing: .01em;
          text-align: center;
        }
        .pr-cta-primary {
          background: var(--amber);
          color: #080c1a;
          box-shadow: 0 2px 16px rgba(245,158,11,.3);
        }
        .pr-cta-primary:hover {
          opacity: .92;
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(245,158,11,.45);
        }
        .pr-cta-ghost {
          background: transparent;
          color: var(--text2);
          border: 1px solid var(--border);
        }
        .pr-cta-ghost:hover {
          color: var(--text);
          border-color: rgba(255,255,255,.2);
          background: var(--bg3, #111827);
        }

        /* ── FAQ ─────────────────────────────────────────────────────────── */
        .pr-faq {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 24px 96px;
          animation: fadeUp .5s ease .25s both;
        }
        .pr-faq-header {
          text-align: center;
          margin-bottom: 36px;
        }
        .pr-faq-title {
          font-family: var(--font-display);
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 800;
          text-transform: uppercase;
          color: var(--text);
          margin-bottom: 10px;
          line-height: 1;
        }
        .pr-faq-subtitle {
          font-size: 14px;
          color: var(--text3);
        }
        .pr-faq-list {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
        }
        .pr-faq-item:last-child { border-bottom: none !important; }

        /* ── Footer ──────────────────────────────────────────────────────── */
        .pr-footer {
          border-top: 1px solid var(--border);
          padding: 36px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          max-width: 1080px;
          margin: 0 auto;
        }
        .pr-footer-copy {
          font-size: 12px;
          color: var(--text4);
        }
        .pr-footer-links {
          display: flex;
          gap: 20px;
        }
        .pr-footer-link {
          font-size: 12px;
          color: var(--text4);
          text-decoration: none;
          transition: color .15s;
        }
        .pr-footer-link:hover { color: var(--text2); }

        /* ── Responsive ──────────────────────────────────────────────────── */
        @media (max-width: 720px) {
          .pr-grid {
            grid-template-columns: 1fr;
            max-width: 480px;
          }
        }
        @media (max-width: 640px) {
          .pr-nav { padding: 0 20px; height: 58px; }
          .pr-back-link span { display: none; }
          .pr-footer { padding: 28px 20px; flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 480px) {
          .pr-hero { padding: 64px 20px 56px; }
          .pr-section { padding: 0 16px 72px; }
          .pr-faq { padding: 0 16px 72px; }
        }
      `}</style>

      {/* ══ NAV ══════════════════════════════════════════════════════════════ */}
      <nav className="pr-nav" aria-label="Pricing page navigation">
        <div className="pr-nav-left">
          {/* Logo */}
          <Link href="/" className="pr-logo" aria-label="WorkForge home">
            <div className="pr-logo-mark">
              <svg width="18" height="18" viewBox="-44 -44 88 88" aria-hidden="true">
                <path d={BOLT_PATH} fill="#080c1a" />
              </svg>
            </div>
            <span className="pr-logo-text">
              Work<span>Forge</span>
            </span>
          </Link>

          {/* Back to home */}
          <Link href="/" className="pr-back-link" aria-label="Back to home">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M10 7H4M4 7l3-3M4 7l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Back to home</span>
          </Link>
        </div>

        <div className="pr-nav-right">
          <Link href="/login" className="pr-nav-link">Sign in</Link>
          <Link href="/register" className="pr-nav-cta">Start Free</Link>
        </div>
      </nav>

      {/* ══ HERO ═════════════════════════════════════════════════════════════ */}
      <header className="pr-hero">
        <div className="pr-hero-grid" aria-hidden="true" />
        <div className="pr-hero-glow" aria-hidden="true" />

        <div className="pr-hero-inner">
          <div className="pr-eyebrow" aria-hidden="true">
            <svg width="10" height="10" viewBox="-44 -44 88 88">
              <path d={BOLT_PATH} fill="currentColor" />
            </svg>
            Pricing
          </div>

          <h1 className="pr-headline">
            Simple,{' '}
            <span className="pr-headline-accent">honest</span>
            <br />
            pricing
          </h1>

          <p className="pr-subtitle">
            Start free. Upgrade when you&rsquo;re ready. No contracts.
          </p>
        </div>
      </header>

      {/* ══ PRICING CARDS ════════════════════════════════════════════════════ */}
      <main>
        <section className="pr-section" aria-label="Pricing tiers">
          <div className="pr-grid" role="list">

            {/* ── Pro ───────────────────────────────────────────────────── */}
            <article className="pr-card pr-card-pro" role="listitem" aria-label="Standard plan">
              <p className="pr-tier-label" style={{ color: 'var(--amber)' }}>Standard</p>
              <h2 className="pr-tier-name" style={{ color: 'var(--amber)' }}>WorkForge</h2>

              <div className="pr-price-block">
                <span className="pr-price-currency" style={{ color: 'var(--amber)', opacity: .7 }}>$</span>
                <span className="pr-price-amount" style={{ color: 'var(--amber)' }}>139</span>
                <span className="pr-price-period">/mo</span>
              </div>
              <p className="pr-price-desc">14-day free trial (up to 5 users) &mdash; then $139/mo, cancel anytime.</p>

              <div className="pr-divider" />

              <ul className="pr-features-list" aria-label="Pro features">
                <Feature text="Up to 15 users · unlimited jobs" />
                <Feature text="Kanban dispatch board" />
                <Feature text="Invoicing, payments &amp; estimates" />
                <Feature text="Equipment tracking &amp; service contracts" />
                <Feature text="Mobile field view for technicians" />
                <Feature text="Appointment reminders (email &amp; SMS)" />
                <Feature text="AI marketing tools &amp; post generator" />
                <Feature text="Role-based access (5 roles)" />
                <Feature text="Audit log &amp; reporting dashboard" />
                <Feature text="14-day free trial (up to 5 users)" />
              </ul>

              <Link href="/register" className="pr-cta pr-cta-primary" aria-label="Start 14-day free trial with Standard plan">
                Start 14-Day Free Trial
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <p style={{ fontSize: 12, color: 'var(--text4)', textAlign: 'center', marginTop: 12 }}>No credit card required · Trial limited to 5 users</p>
            </article>

            {/* ── Enterprise ────────────────────────────────────────────── */}
            <article className="pr-card" role="listitem" aria-label="Enterprise plan">
              <p className="pr-tier-label">Enterprise</p>
              <h2 className="pr-tier-name">Custom</h2>

              <div className="pr-price-block">
                <span className="pr-price-custom">Let&rsquo;s talk</span>
              </div>
              <p className="pr-price-desc">Tailored pricing for large teams &amp; multi-location orgs.</p>

              <div className="pr-divider" />

              <ul className="pr-features-list" aria-label="Enterprise features">
                <Feature text="Everything in Standard" />
                <Feature text="Custom integrations" />
                <Feature text="Dedicated account manager" />
                <Feature text="SLA guarantee" />
                <Feature text="Custom reporting &amp; exports" />
                <Feature text="SSO / SAML" />
                <Feature text="Volume &amp; annual discounts" />
              </ul>

              <a
                href="mailto:support@getworkforge.com"
                className="pr-cta pr-cta-ghost"
                aria-label="Contact sales for Enterprise plan"
              >
                Contact Sales
              </a>
            </article>

          </div>
        </section>

        {/* ══ FAQ ══════════════════════════════════════════════════════════ */}
        <section className="pr-faq" aria-label="Frequently asked questions">
          <div className="pr-faq-header">
            <h2 className="pr-faq-title">Common questions</h2>
            <p className="pr-faq-subtitle">
              Still not sure? Reach us at{' '}
              <a href="mailto:support@getworkforge.com" style={{ color: 'var(--amber)', textDecoration: 'none' }}>
                support@getworkforge.com
              </a>
            </p>
          </div>

          <div className="pr-faq-list" role="list">
            <div className="pr-faq-item" role="listitem">
              <FaqItem
                q="Can I change plans later?"
                a="Absolutely. You can upgrade or downgrade your plan at any time from your account settings. Changes take effect at the start of your next billing cycle."
              />
            </div>
            <div className="pr-faq-item" role="listitem">
              <FaqItem
                q="Is there a free trial?"
                a="Yes — WorkForge includes a 14-day free trial, limited to 5 users. No credit card required. You get full access to every feature so you can evaluate it with your real crew before committing."
              />
            </div>
            <div className="pr-faq-item" role="listitem">
              <FaqItem
                q="What happens when I hit the Starter limits?"
                a="You'll see a prompt in-app to upgrade to Pro. Your existing data and jobs remain safe. Nothing gets deleted — you just can't create new jobs until you upgrade or the month resets."
              />
            </div>
            <div className="pr-faq-item" role="listitem">
              <FaqItem
                q="Do you offer annual billing?"
                a="Yes — annual billing saves you two months compared to monthly. Reach out to our team or look for the annual toggle in the upgrade flow."
              />
            </div>
          </div>
        </section>
      </main>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer>
        <div className="pr-footer">
          <p className="pr-footer-copy">
            &copy; {new Date().getFullYear()} WorkForge. All rights reserved.
          </p>
          <nav className="pr-footer-links" aria-label="Footer links">
            <Link href="/login" className="pr-footer-link">Sign in</Link>
            <Link href="/register" className="pr-footer-link">Register</Link>
            <Link href="/terms" className="pr-footer-link">Terms</Link>
            <Link href="/privacy" className="pr-footer-link">Privacy</Link>
          </nav>
        </div>
      </footer>
    </>
  )
}
