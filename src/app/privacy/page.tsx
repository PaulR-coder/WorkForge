import Link from 'next/link'

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
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--amber)' }}>Work<span style={{ color: 'var(--text)' }}>Forge</span></span>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: 'var(--text4)', marginBottom: 40 }}>Last updated: May 15, 2026</p>

      {[
        {
          title: 'What We Collect',
          body: 'We collect the information you provide when creating an account: your name, email address, company name, and password (stored as a secure hash). We also collect usage data (login timestamps, audit events) to support platform operation and security.',
        },
        {
          title: 'How We Use Your Data',
          body: 'Your data is used solely to operate and improve WorkForge. This includes: authenticating your identity, displaying your workspace data, sending transactional emails (verification, password reset, job notifications), and monitoring platform health.',
        },
        {
          title: 'Data Isolation',
          body: 'Each business workspace on WorkForge is completely isolated. Users can only access data belonging to their own organization. WorkForge employees do not access tenant data except as required to provide support or resolve platform issues.',
        },
        {
          title: 'Third-Party Services',
          body: 'WorkForge uses the following third-party services: Resend (email delivery), Railway (cloud infrastructure and database hosting), Sentry (error monitoring), and Anthropic (AI-powered platform health summaries). Each of these services processes data under their own privacy policies and our data processing agreements.',
        },
        {
          title: 'Data Retention',
          body: 'Active account data is retained for as long as your workspace exists. Upon account deletion, all data is permanently removed within 30 days. You may request a data export at any time by contacting support@workforge.io.',
        },
        {
          title: 'Security',
          body: 'Passwords are hashed using bcrypt. Sessions are stored as signed JWT tokens in HTTP-only cookies. All data is transmitted over HTTPS. We use industry-standard practices to protect your information.',
        },
        {
          title: 'Your Rights',
          body: 'You have the right to access, correct, or delete your personal data at any time. To exercise these rights, contact us at support@workforge.io. We will respond within 30 days.',
        },
        {
          title: 'Cookies',
          body: 'WorkForge uses a single HTTP-only session cookie (wf_session) to maintain your login state. We do not use tracking or advertising cookies.',
        },
        {
          title: 'Contact',
          body: 'For privacy questions or data requests, contact: support@workforge.io',
        },
      ].map(({ title, body }) => (
        <div key={title} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.7, margin: 0 }}>{body}</p>
        </div>
      ))}
    </div>
  )
}
