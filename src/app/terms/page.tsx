import Link from 'next/link'

export default function TermsPage() {
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

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ fontSize: 13, color: 'var(--text4)', marginBottom: 40 }}>Last updated: May 15, 2026</p>

      {[
        {
          title: '1. Acceptance of Terms',
          body: 'By creating a WorkForge account, you agree to these Terms of Service. If you do not agree, do not use the platform. These terms apply to all users, including business owners, administrators, dispatchers, and technicians.',
        },
        {
          title: '2. Use of the Platform',
          body: 'WorkForge is a field operations management platform for service businesses. You may use it only for lawful purposes and in accordance with these terms. You are responsible for all activity that occurs under your account.',
        },
        {
          title: '3. Account Responsibilities',
          body: 'You are responsible for maintaining the confidentiality of your login credentials. You must notify us immediately at support@workforge.io if you believe your account has been compromised. WorkForge is not liable for any loss resulting from unauthorized account access.',
        },
        {
          title: '4. Data Ownership',
          body: 'You own your business data. WorkForge does not sell your data to third parties. We process your data only to provide and improve the platform. Each business workspace is fully isolated — users cannot access data from other organizations.',
        },
        {
          title: '5. Service Availability',
          body: 'We aim for high availability but do not guarantee uninterrupted service. Scheduled maintenance will be communicated in advance when possible. WorkForge is not liable for losses resulting from service interruptions.',
        },
        {
          title: '6. Prohibited Conduct',
          body: 'You may not use WorkForge to: violate any law or regulation; transmit malicious code; attempt to gain unauthorized access to other accounts or systems; scrape or reverse-engineer the platform; or use the service in a way that degrades performance for other users.',
        },
        {
          title: '7. Termination',
          body: 'Either party may terminate a WorkForge account at any time. Upon termination, your data will be retained for 30 days before deletion, during which you may request an export. After 30 days, all data is permanently deleted.',
        },
        {
          title: '8. Limitation of Liability',
          body: 'WorkForge is provided "as is." To the fullest extent permitted by law, WorkForge and its creators are not liable for indirect, incidental, or consequential damages arising from your use of the platform.',
        },
        {
          title: '9. Changes to These Terms',
          body: 'We may update these terms from time to time. Material changes will be communicated via email at least 14 days in advance. Continued use of WorkForge after changes constitutes acceptance of the new terms.',
        },
        {
          title: '10. Contact',
          body: 'Questions about these terms? Reach us at support@workforge.io.',
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
