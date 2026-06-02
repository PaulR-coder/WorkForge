import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import type { Metadata } from 'next'
import AppMockup from '@/components/landing/AppMockup'

export const metadata: Metadata = {
  title: 'WorkForge — Field Service Management for HVAC, Plumbing & Electrical',
  description: 'WorkForge is the all-in-one field service management platform for HVAC, plumbing, and electrical contractors. Dispatch faster, invoice in 60 seconds, manage your whole crew. Built for Tampa and growing.',
  keywords: [
    'field service management software',
    'work order management app',
    'job dispatch software',
    'technician scheduling software',
    'HVAC dispatch software',
    'plumbing business management',
    'electrical contractor software',
    'service business software',
    'field service software Tampa',
    'Tampa HVAC software',
    'Tampa service business management',
  ],
  openGraph: {
    title: 'WorkForge — Field Service Management Software for Tampa & Beyond',
    description: 'WorkForge is the all-in-one field service management platform for HVAC, plumbing, and electrical contractors. Dispatch faster, invoice in 60 seconds, manage your whole crew.',
    url: 'https://getworkforge.com',
    siteName: 'WorkForge',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WorkForge — Field Service Management Software for Tampa & Beyond',
    description: 'WorkForge is the all-in-one field service management platform for HVAC, plumbing, and electrical contractors.',
  },
}

export default async function Home() {
  const session = await getSession()
  if (session) redirect('/dashboard')

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', fontSize: 32 }}>
      WORKFORGE_LANDING_TEST_2026
    </div>
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'WorkForge',
              url: 'https://getworkforge.com',
              description: 'Field service management platform for HVAC, plumbing, and electrical contractors.',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Tampa',
                addressRegion: 'FL',
                addressCountry: 'US',
              },
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'support@getworkforge.com',
                contactType: 'customer support',
              },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'WorkForge',
              url: 'https://getworkforge.com',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              description: 'All-in-one field service management for HVAC, plumbing, and electrical contractors. Work orders, dispatch, invoicing, and team management.',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                description: '14-day free trial',
              },
              audience: {
                '@type': 'Audience',
                audienceType: 'HVAC contractors, plumbers, electricians, field service businesses',
              },
            },
          ]),
        }}
      />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #060a17;
          --bg2: #0a0f1e;
          --bg3: #111827;
          --bg4: #141d2e;
          --text: #f0f4ff;
          --text2: #a8b8cc;
          --text3: #7a8fa6;
          --text4: #566882;
          --amber: #f59e0b;
          --amber-dim: rgba(245,158,11,.13);
          --amber-border: rgba(245,158,11,.28);
          --green: #22c55e;
          --red: #ef4444;
          --blue-light: #5ba3f5;
          --purple: #a78bfa;
          --border: rgba(255,255,255,.09);
          --shadow-xl: 0 20px 60px rgba(0,0,0,.7);
          --font-display: 'Barlow Condensed', sans-serif;
          --font-body: 'DM Sans', sans-serif;
          --font-mono: 'DM Mono', monospace;
        }

        html, body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-body);
          min-height: 100vh;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gridPulse {
          0%,100% { opacity: .04; }
          50%      { opacity: .07; }
        }
        @keyframes glowPulse {
          0%,100% { opacity: .35; }
          50%      { opacity: .55; }
        }
        @keyframes boltSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .land-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          height: 64px;
          background: rgba(6,10,23,.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }

        .land-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
        }
        .land-logo-mark {
          width: 34px;
          height: 34px;
          background: var(--amber);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .land-logo-text {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          color: var(--text);
        }
        .land-logo-text span { color: var(--amber); }

        .land-nav-links {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .land-nav-link {
          font-size: 13px;
          font-weight: 500;
          color: var(--text3);
          text-decoration: none;
          padding: 7px 14px;
          border-radius: 8px;
          transition: color .15s, background .15s;
        }
        .land-nav-link:hover { color: var(--text); background: var(--bg3); }

        .land-nav-cta {
          font-size: 13px;
          font-weight: 700;
          color: #080c1a;
          text-decoration: none;
          padding: 8px 18px;
          border-radius: 8px;
          background: var(--amber);
          transition: opacity .15s, transform .15s;
        }
        .land-nav-cta:hover { opacity: .9; transform: translateY(-1px); }

        .land-hero {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 120px 24px 80px;
          position: relative;
          overflow: hidden;
        }

        .land-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: gridPulse 5s ease infinite;
          pointer-events: none;
        }

        .land-glow {
          position: absolute;
          top: 20%;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(245,158,11,.12) 0%, transparent 65%);
          animation: glowPulse 4s ease infinite;
          pointer-events: none;
        }

        .land-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          border-radius: 100px;
          border: 1px solid var(--amber-border);
          background: var(--amber-dim);
          font-size: 11px;
          font-weight: 700;
          color: var(--amber);
          letter-spacing: .06em;
          text-transform: uppercase;
          margin-bottom: 28px;
          animation: fadeUp .5s ease both;
        }

        .land-headline {
          font-family: var(--font-display);
          font-size: clamp(52px, 8vw, 88px);
          font-weight: 800;
          line-height: .95;
          letter-spacing: -.01em;
          text-transform: uppercase;
          color: var(--text);
          margin-bottom: 6px;
          animation: fadeUp .5s ease .1s both;
        }
        .land-headline-accent { color: var(--amber); }

        .land-sub {
          font-size: clamp(14px, 2.5vw, 18px);
          color: var(--text3);
          max-width: 540px;
          line-height: 1.65;
          margin: 20px auto 40px;
          animation: fadeUp .5s ease .2s both;
        }

        .land-cta-group {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          animation: fadeUp .5s ease .3s both;
        }

        .land-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          border-radius: 10px;
          background: var(--amber);
          color: #080c1a;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          font-family: var(--font-body);
          transition: opacity .15s, transform .15s, box-shadow .15s;
          box-shadow: 0 4px 20px rgba(245,158,11,.3);
        }
        .land-btn-primary:hover {
          opacity: .92;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(245,158,11,.45);
        }

        .land-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 24px;
          border-radius: 10px;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text2);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          font-family: var(--font-body);
          transition: border-color .15s, color .15s, background .15s;
        }
        .land-btn-secondary:hover {
          border-color: rgba(255,255,255,.2);
          color: var(--text);
          background: var(--bg3);
        }

        .land-features {
          padding: 100px 24px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .land-section-label {
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--amber);
          margin-bottom: 12px;
        }

        .land-section-title {
          font-family: var(--font-display);
          font-size: clamp(32px, 5vw, 48px);
          font-weight: 800;
          text-transform: uppercase;
          color: var(--text);
          margin-bottom: 14px;
          line-height: 1;
        }

        .land-section-desc {
          font-size: 15px;
          color: var(--text3);
          max-width: 520px;
          line-height: 1.65;
          margin-bottom: 60px;
        }

        .land-grid-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }

        .land-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 24px;
          transition: border-color .2s, box-shadow .2s;
        }
        .land-card:hover {
          border-color: var(--amber-border);
          box-shadow: 0 0 0 1px var(--amber-border), 0 12px 40px rgba(0,0,0,.4);
        }

        .land-card-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--amber-dim);
          border: 1px solid var(--amber-border);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          color: var(--amber);
        }

        .land-card-title {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text);
          margin-bottom: 8px;
          letter-spacing: .02em;
        }

        .land-card-body {
          font-size: 13px;
          color: var(--text3);
          line-height: 1.65;
        }

        .land-stats {
          background: var(--bg2);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 60px 24px;
        }

        .land-stats-inner {
          max-width: 900px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 40px;
          text-align: center;
        }

        .land-stat-value {
          font-family: var(--font-display);
          font-size: 48px;
          font-weight: 800;
          color: var(--amber);
          line-height: 1;
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        .land-stat-label {
          font-size: 13px;
          color: var(--text4);
          font-weight: 500;
        }

        .land-pricing {
          padding: 100px 24px;
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
        }

        .land-price-card {
          background: var(--bg2);
          border: 1px solid var(--amber-border);
          border-radius: 20px;
          padding: 48px 40px;
          max-width: 520px;
          margin: 0 auto;
          box-shadow: 0 0 60px rgba(245,158,11,.08), 0 20px 60px rgba(0,0,0,.4);
          position: relative;
          overflow: hidden;
        }

        .land-price-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--amber), rgba(245,158,11,.4));
        }

        .land-price-amount {
          font-family: var(--font-display);
          font-size: 72px;
          font-weight: 800;
          color: var(--amber);
          line-height: 1;
          letter-spacing: -.02em;
        }

        .land-price-period {
          font-size: 16px;
          color: var(--text3);
          margin-left: 2px;
        }

        .land-price-tagline {
          font-size: 14px;
          color: var(--text4);
          margin-top: 6px;
          margin-bottom: 36px;
        }

        .land-price-features {
          list-style: none;
          text-align: left;
          margin-bottom: 36px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .land-price-feature {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: var(--text2);
        }

        .land-price-check {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(34,197,94,.12);
          border: 1px solid rgba(34,197,94,.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--green);
        }

        .land-price-note {
          font-size: 12px;
          color: var(--text4);
          margin-top: 16px;
        }

        .land-footer {
          padding: 48px 40px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .land-footer-copy {
          font-size: 12px;
          color: var(--text4);
        }

        .land-footer-links {
          display: flex;
          gap: 20px;
        }

        .land-footer-link {
          font-size: 12px;
          color: var(--text4);
          text-decoration: none;
          transition: color .15s;
        }
        .land-footer-link:hover { color: var(--text2); }

        @media (max-width: 640px) {
          .land-nav { padding: 0 20px; }
          .land-nav-link { display: none; }
          .land-footer { padding: 32px 20px; flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&family=DM+Mono&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav className="land-nav">
        <a href="/" className="land-logo">
          <div className="land-logo-mark">
            <svg width="18" height="18" viewBox="-44 -44 88 88">
              <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="#080c1a" />
            </svg>
          </div>
          <span className="land-logo-text">Work<span>Forge</span></span>
        </a>
        <div className="land-nav-links">
          <a href="#features" className="land-nav-link">Features</a>
          <a href="#why" className="land-nav-link">Why WorkForge</a>
          <a href="#pricing" className="land-nav-link">Pricing</a>
          <a href="/login" className="land-nav-link">Sign in</a>
          <a href="/register" className="land-nav-cta">Get started</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="land-hero">
        <div className="land-grid" aria-hidden="true" />
        <div className="land-glow" aria-hidden="true" />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="land-badge">
            <svg width="10" height="10" viewBox="-44 -44 88 88">
              <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="currentColor" />
            </svg>
            Field Operations Platform
          </div>

          <h1 className="land-headline">
            Run Your Crew.<br />
            <span className="land-headline-accent">Win Every Job.</span>
          </h1>

          <p className="land-sub">
            WorkForge is the all-in-one field operations platform built for HVAC, plumbing, electrical, and service businesses that want to dispatch smarter and close faster.
          </p>

          <div className="land-cta-group">
            <Link href="/register" className="land-btn-primary">
              Start free trial
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href="/login" className="land-btn-secondary">
              Sign in to your account
            </Link>
          </div>
        </div>
      </section>

      {/* App preview */}
      <div style={{ padding: '0 24px 80px', maxWidth: 1000, margin: '0 auto' }}>
        <AppMockup />
      </div>

      {/* Stats */}
      <div className="land-stats" id="why">
        <div className="land-stats-inner">
          <div>
            <div className="land-stat-value">4×</div>
            <div className="land-stat-label">Faster job dispatching</div>
          </div>
          <div>
            <div className="land-stat-value">98%</div>
            <div className="land-stat-label">Uptime SLA</div>
          </div>
          <div>
            <div className="land-stat-value">60s</div>
            <div className="land-stat-label">To create an invoice</div>
          </div>
          <div>
            <div className="land-stat-value">5</div>
            <div className="land-stat-label">Roles with fine-grained access</div>
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="land-features" id="features">
        <div className="land-section-label">What's included</div>
        <h2 className="land-section-title">Everything your crew needs</h2>
        <p className="land-section-desc">
          From Kanban dispatch boards to PDF invoices and AI-powered support — WorkForge gives your team a single source of truth.
        </p>

        <div className="land-grid-features">
          {[
            {
              title: 'Kanban Dispatch',
              body: 'Drag-and-drop job board with columns for Open, In Progress, Scheduled, and Done. Filter by tech, search by client.',
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="1" y="3" width="5" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <rect x="7.5" y="3" width="5" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <rect x="14" y="3" width="5" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              ),
            },
            {
              title: 'Invoicing & Payments',
              body: 'Generate professional invoices in seconds. Accept card, cash, check, or digital payments with signature capture.',
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="4" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
                  <line x1="2" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="1.6" />
                  <rect x="5" y="11" width="4" height="2.5" rx="1" fill="currentColor" opacity=".6" />
                </svg>
              ),
            },
            {
              title: 'Field View',
              body: 'Mobile-first technician view shows only the jobs assigned to them. No clutter, just the work that matters.',
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="5" y="1" width="10" height="18" rx="3" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="10" cy="15.5" r="1" fill="currentColor" opacity=".5" />
                </svg>
              ),
            },
            {
              title: 'Equipment & Contracts',
              body: 'Track every unit per client, schedule PM visits, and manage recurring service contracts with MRR tracking.',
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M10 1v2.5M10 16.5V19M1 10h2.5M16.5 10H19M3.2 3.2l1.8 1.8M15 15l1.8 1.8M16.8 3.2 15 5M5 15l-1.8 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              title: 'Role-Based Access',
              body: 'Five granular roles — superadmin, admin, dispatcher, tech, readonly. Every user sees exactly what they need.',
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M3 18c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              title: 'AI Support Chat',
              body: 'Built-in support agent diagnoses bugs and logs tickets automatically — no email back-and-forth required.',
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2C5.58 2 2 5.36 2 9.5c0 1.9.73 3.63 1.93 5L3 18l4.07-1.17C8.2 17.58 9.09 17.75 10 17.75 14.42 17.75 18 14.39 18 9.5S14.42 2 10 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              ),
            },
          ].map(({ title, body, icon }) => (
            <div key={title} className="land-card">
              <div className="land-card-icon">{icon}</div>
              <div className="land-card-title">{title}</div>
              <p className="land-card-body">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="land-pricing" id="pricing">
        <div className="land-section-label">Pricing</div>
        <h2 className="land-section-title">One plan. Everything included.</h2>
        <p className="land-section-desc" style={{ margin: '0 auto 48px' }}>
          No per-seat fees. No feature tiers. No surprises. Pay one flat rate and give your whole team access to every tool WorkForge offers.
        </p>

        <div className="land-price-card">
          <div>
            <span className="land-price-amount">$139</span>
            <span className="land-price-period">/ month</span>
          </div>
          <div className="land-price-tagline">Everything included · Up to 15 users · Unlimited jobs</div>

          <ul className="land-price-features">
            {[
              'Kanban dispatch board & job management',
              'Invoicing, payments & signature capture',
              'Mobile field view for technicians',
              'Equipment tracking & service contracts',
              'Appointment reminders via email & SMS',
              'AI marketing tools & post generator',
              'Role-based access (5 roles)',
              'Audit log & reporting dashboard',
              'Email support',
            ].map((f) => (
              <li key={f} className="land-price-feature">
                <span className="land-price-check">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2 5.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>

          <Link href="/register" className="land-btn-primary" style={{ width: '100%', justifyContent: 'center', boxSizing: 'border-box' }}>
            Start your 14-day free trial
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <p className="land-price-note">14-day free trial · Up to 5 users · No credit card required</p>
        </div>
        <p style={{ marginTop: 24, fontSize: 13, color: 'var(--text4)' }}>
          Need a custom plan for a larger team?{' '}
          <a href="mailto:support@getworkforge.com" style={{ color: 'var(--amber)', textDecoration: 'none' }}>Contact us →</a>
        </p>
      </section>

      {/* CTA Strip */}
      <section style={{
        background: 'var(--bg2)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 5vw, 52px)',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: 'var(--text)',
            marginBottom: 16,
            lineHeight: 1,
          }}>
            Ready to forge ahead?
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text3)', marginBottom: 36, lineHeight: 1.65 }}>
            Join service businesses already using WorkForge to dispatch smarter, invoice faster, and grow with confidence.
          </p>
          <div className="land-cta-group">
            <Link href="/register" className="land-btn-primary">
              Create your account
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href="/login" className="land-btn-secondary">Sign in</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="land-footer">
          <div>
            <a href="/" className="land-logo" style={{ marginBottom: 8, display: 'inline-flex' }}>
              <div className="land-logo-mark">
                <svg width="16" height="16" viewBox="-44 -44 88 88">
                  <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="#080c1a" />
                </svg>
              </div>
              <span className="land-logo-text" style={{ fontSize: 17 }}>Work<span>Forge</span></span>
            </a>
            <p className="land-footer-copy" style={{ marginTop: 6 }}>
              &copy; {new Date().getFullYear()} WorkForge. All rights reserved.
            </p>
          </div>
          <div className="land-footer-links">
            <Link href="/pricing" className="land-footer-link">Pricing</Link>
            <Link href="/privacy" className="land-footer-link">Privacy</Link>
            <Link href="/terms" className="land-footer-link">Terms</Link>
            <a href="mailto:support@getworkforge.com" className="land-footer-link">Support</a>
          </div>
        </div>
      </footer>
    </>
  )
}
