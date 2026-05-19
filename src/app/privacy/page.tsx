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
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', color: 'var(--text)', fontFamily: 'inherit' }}>
      <Link href="/register" style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700, textDecoration: 'none', display: 'inline-block', marginBottom: 32 }}>← Back</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <div style={{ width: 36, height: 36, background: 'var(--amber)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="-44 -44 88 88" style={{ width: 18, height: 18 }}>
            <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="#080c1a" />
          </svg>
        </div>
        <span style={{ fontSize: 20, fontWeight: 800 }}><span style={{ color: 'var(--text)' }}>Work</span><span style={{ color: 'var(--amber)' }}>Forge</span></span>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: 'var(--text4)', marginBottom: 40 }}>Last updated: May 18, 2026</p>

      {SECTIONS.map(({ title, body }) => (
        <div key={title} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>{body}</p>
        </div>
      ))}
    </div>
  )
}
