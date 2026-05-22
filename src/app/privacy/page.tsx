import Link from 'next/link'

const SECTIONS = [
  {
    title: 'What We Collect',
    body: 'We collect the information you provide when creating an account: your name, email address, company name, and password (stored as a secure hash). We also collect: operational data you enter into the platform (job details, client names, addresses, notes, photos); usage data (login timestamps, audit events) to support platform operation and security; and device information for push notification delivery.',
  },
  {
    title: 'How We Use Your Data',
    body: 'Your data is used solely to operate and improve WorkForge. This includes: authenticating your identity; displaying your workspace data; sending transactional emails (verification, password reset, job notifications, subscription confirmations); monitoring platform health; and generating AI-powered platform summaries (see Third-Party Services below). We do not use your data for advertising.',
  },
  {
    title: 'Data Isolation',
    body: 'Each business workspace on WorkForge is completely isolated. Users can only access data belonging to their own organization. WorkForge personnel do not access tenant data except as required to provide support or resolve platform issues, and only with appropriate authorization.',
  },
  {
    title: 'Third-Party Services',
    body: 'WorkForge uses the following third-party services to operate the platform: Resend (email delivery); Railway (cloud infrastructure and database hosting); Sentry (error monitoring — may process limited technical data including IP addresses); Stripe (payment processing — governed by Stripe\'s privacy policy); and Anthropic (AI-powered platform health summaries). Data sent to Anthropic is limited to operational platform metrics and is processed under our data processing agreement — it is not used to train Anthropic\'s models. Each service processes data under its own privacy policy.',
  },
  {
    title: 'Cookies',
    body: 'WorkForge uses a single HTTP-only session cookie (wf_session) to maintain your login state. This cookie is strictly necessary for the platform to function and does not track you across other websites. We do not use advertising, analytics, or tracking cookies.',
  },
  {
    title: 'Data Retention',
    body: 'Active account data is retained for as long as your workspace exists. Upon account deletion or subscription cancellation, all workspace data is permanently removed within 30 days. You may request a data export at any time by contacting support@getworkforge.com.',
  },
  {
    title: 'Security',
    body: 'Passwords are hashed using bcrypt. Sessions are stored as signed JWT tokens in HTTP-only, Secure cookies. All data is transmitted over HTTPS with HSTS enforced. We use industry-standard practices to protect your information against unauthorized access, disclosure, or destruction.',
  },
  {
    title: 'Data Breach Notification',
    body: 'In the event of a data breach that is reasonably likely to result in risk to your rights or freedoms, we will notify affected users and applicable authorities as required by applicable law, generally within 72 hours of discovery. Notification will be sent to the email address associated with your account.',
  },
  {
    title: 'Your Rights (All Users)',
    body: 'You have the right to access, correct, or delete your personal data at any time. To exercise these rights, contact us at support@getworkforge.com. We will respond within 30 days. You may also export your workspace data by contacting support before account deletion.',
  },
  {
    title: 'California Residents — CCPA/CPRA Rights',
    body: 'If you are a California resident, you have the following additional rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):\n\n• Right to Know: Request the specific pieces and categories of personal information we have collected about you in the past 12 months.\n• Right to Delete: Request deletion of your personal information, subject to exceptions required by law.\n• Right to Correct: Request correction of inaccurate personal information we hold about you.\n• Right to Opt-Out: We do not sell or share your personal information for cross-context behavioral advertising. No opt-out action is required.\n• Right to Non-Discrimination: We will not discriminate against you for exercising any of these rights.\n\nCategories of personal information collected: identifiers (name, email); commercial information (subscription and billing records); internet activity (login timestamps, session data); professional information (company name, job role); and location data (service addresses entered into the platform by your business).\n\nTo exercise your CCPA/CPRA rights, email us at support@getworkforge.com with the subject line "California Privacy Request." We will respond within 45 days.',
  },
  {
    title: 'Other State Privacy Rights',
    body: 'Residents of Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Oregon (OCPA), and Texas (TDPSA) have similar rights to access, correct, delete, and opt out of the sale or sharing of personal data. WorkForge does not sell personal information. To exercise any applicable state privacy right, contact us at support@getworkforge.com. We will respond within 45 days.',
  },
  {
    title: 'Contact & Physical Address',
    body: 'For privacy questions, data requests, or to exercise any of the rights described in this policy, contact us at:\n\nEmail: support@getworkforge.com\nMail: WorkForge, 11814 Whisper Creek Dr, Riverview, FL 33569',
  },
]

export default function PrivacyPage() {
  return (
    <>
      <style>{`
        .legal-page {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-body);
          padding-bottom: 80px;
        }
        .legal-header {
          border-bottom: 1px solid var(--border);
          padding: 20px 0;
          margin-bottom: 0;
        }
        .legal-header-inner {
          max-width: 760px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .legal-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
        }
        .legal-logo-mark {
          width: 30px;
          height: 30px;
          background: var(--amber);
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .legal-logo-text {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          color: var(--text);
        }
        .legal-logo-text span { color: var(--amber); }
        .legal-back {
          font-size: 12px;
          font-weight: 600;
          color: var(--text4);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: color .15s;
        }
        .legal-back:hover { color: var(--text2); }
        .legal-body {
          max-width: 760px;
          margin: 0 auto;
          padding: 52px 24px 0;
        }
        .legal-title {
          font-family: var(--font-display);
          font-size: clamp(36px, 6vw, 52px);
          font-weight: 800;
          text-transform: uppercase;
          color: var(--text);
          letter-spacing: -.01em;
          margin-bottom: 6px;
          line-height: 1;
        }
        .legal-date {
          font-size: 12px;
          color: var(--text4);
          margin-bottom: 48px;
          display: block;
        }
        .legal-divider {
          border: none;
          border-top: 1px solid var(--border);
          margin: 0 0 48px;
        }
        .legal-section {
          padding: 28px 0;
          border-bottom: 1px solid var(--border);
        }
        .legal-section:last-child { border-bottom: none; }
        .legal-section-title {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .04em;
          color: var(--text);
          margin-bottom: 12px;
        }
        .legal-section-body {
          font-size: 14px;
          color: var(--text3);
          line-height: 1.75;
          white-space: pre-line;
        }
      `}</style>

      <div className="legal-page">
        <header className="legal-header">
          <div className="legal-header-inner">
            <Link href="/" className="legal-logo">
              <div className="legal-logo-mark">
                <svg viewBox="-44 -44 88 88" width="16" height="16">
                  <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="#080c1a" />
                </svg>
              </div>
              <span className="legal-logo-text">Work<span>Forge</span></span>
            </Link>
            <Link href="/register" className="legal-back">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M12 7H2M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </Link>
          </div>
        </header>

        <div className="legal-body">
          <h1 className="legal-title">Privacy Policy</h1>
          <span className="legal-date">Last updated: May 18, 2026</span>
          <hr className="legal-divider" />

          {SECTIONS.map(({ title, body }) => (
            <div key={title} className="legal-section">
              <h2 className="legal-section-title">{title}</h2>
              <p className="legal-section-body">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
