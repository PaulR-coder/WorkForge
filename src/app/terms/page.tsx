import Link from 'next/link'

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By creating a WorkForge account or using the platform in any way, you agree to these Terms of Service ("Terms"). If you do not agree, do not use the platform. These Terms apply to all users, including business owners, administrators, dispatchers, and technicians. Use by a business entity means the entity and all its users accept these Terms.',
  },
  {
    title: '2. Use of the Platform',
    body: 'WorkForge is a field operations management platform for service businesses. You may use it only for lawful purposes and in accordance with these Terms. You are responsible for all activity that occurs under your account and for ensuring that all users in your workspace comply with these Terms.',
  },
  {
    title: '3. Account Responsibilities',
    body: 'You are responsible for maintaining the confidentiality of your login credentials. You must notify us immediately at support@getworkforge.com if you believe your account has been compromised. WorkForge is not liable for any loss resulting from unauthorized account access caused by your failure to maintain credential security.',
  },
  {
    title: '4. Subscription, Pricing & Auto-Renewal',
    body: 'WorkForge Pro is offered as a recurring subscription. By subscribing, you authorize WorkForge to automatically charge your payment method on file at the start of each billing period (monthly or annually, depending on your selection) until you cancel. Pricing is $39 per month as a base fee, plus $12 per month for each active user in your workspace. Prices are subject to change with 30 days\' notice. To cancel, visit the billing portal accessible from your account settings. Cancellations take effect at the end of the current paid billing period — you retain access through that date and will not receive a prorated refund. All fees are exclusive of taxes.',
  },
  {
    title: '5. Data Ownership',
    body: 'You own your business data. WorkForge does not sell your data to third parties. We process your data only to provide and improve the platform. Each business workspace is fully isolated — users cannot access data from other organizations.',
  },
  {
    title: '6. User Content',
    body: 'When you submit, upload, or transmit content to WorkForge — including job details, messages, photos, invoices, and notes ("User Content") — you grant WorkForge a limited, non-exclusive, royalty-free license to host, process, and display that content solely as necessary to provide the platform services. You retain all ownership of your User Content. You represent that you have all rights necessary to submit User Content and that it does not infringe any third-party rights. WorkForge does not claim ownership of your business data.',
  },
  {
    title: '7. Prohibited Conduct',
    body: 'You may not use WorkForge to: violate any law or regulation; transmit malicious code or harmful content; attempt to gain unauthorized access to other accounts or systems; scrape or reverse-engineer the platform; use the service in a way that degrades performance for other users; upload content that infringes third-party intellectual property rights; or harass, defame, or harm other users.',
  },
  {
    title: '8. Service Availability',
    body: 'We aim for high availability but do not guarantee uninterrupted service. WorkForge is provided "as is" and "as available" without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement. Scheduled maintenance will be communicated in advance when possible.',
  },
  {
    title: '9. Limitation of Liability',
    body: 'To the fullest extent permitted by applicable law, WorkForge\'s total cumulative liability arising out of or related to these Terms or your use of the platform shall not exceed the greater of (a) the total fees paid by you to WorkForge in the twelve (12) months immediately preceding the event giving rise to the claim, or (b) one hundred dollars ($100). In no event shall WorkForge be liable for any indirect, incidental, special, exemplary, punitive, or consequential damages — including but not limited to loss of profits, loss of data, loss of goodwill, or business interruption — even if advised of the possibility of such damages. Some jurisdictions do not allow limitation of liability for certain damages; in those jurisdictions, liability is limited to the fullest extent permitted by law.',
  },
  {
    title: '10. Indemnification',
    body: 'You agree to defend, indemnify, and hold harmless WorkForge and its owners, officers, employees, and agents from any claims, liabilities, damages, judgments, and expenses (including reasonable attorneys\' fees) arising out of or relating to: (a) your use of the platform in violation of these Terms; (b) User Content you submit to the platform; (c) your violation of any third-party right, including intellectual property rights; or (d) your violation of any applicable law.',
  },
  {
    title: '11. Dispute Resolution & Arbitration',
    body: 'PLEASE READ THIS SECTION CAREFULLY — IT AFFECTS YOUR LEGAL RIGHTS. Any dispute, claim, or controversy arising out of or relating to these Terms or the use of WorkForge shall be resolved exclusively by binding individual arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules. YOU AND WORKFORGE WAIVE THE RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN CLASS ACTION LITIGATION. Arbitration shall take place in Hillsborough County, Florida. The arbitrator\'s decision shall be final and enforceable in any court of competent jurisdiction. This clause does not prevent either party from seeking injunctive relief in court for intellectual property disputes.',
  },
  {
    title: '12. Copyright & DMCA',
    body: 'WorkForge respects intellectual property rights. If you believe content on the platform infringes your copyright, send a notice to support@getworkforge.com that includes: (a) identification of the copyrighted work claimed to be infringed; (b) identification and location of the allegedly infringing material; (c) your contact information; (d) a statement of good faith belief that the use is not authorized; and (e) a statement under penalty of perjury that the information is accurate and you are authorized to act on behalf of the copyright owner.',
  },
  {
    title: '13. Termination',
    body: 'Either party may terminate a WorkForge account at any time. Upon cancellation or termination, your data will be retained for 30 days, during which you may request an export at support@getworkforge.com. After 30 days, all workspace data is permanently deleted. WorkForge may suspend or terminate accounts that violate these Terms without notice.',
  },
  {
    title: '14. Changes to These Terms',
    body: 'We may update these Terms from time to time. Material changes will be communicated via email at least 14 days in advance. Continued use of WorkForge after the effective date constitutes acceptance of the revised Terms. If you do not agree to the revised Terms, you must stop using the platform and cancel your subscription before the effective date.',
  },
  {
    title: '15. Governing Law',
    body: 'These Terms are governed by and construed in accordance with the laws of the State of Florida, without regard to conflict of law principles. Subject to the arbitration clause above, any legal action not subject to arbitration shall be brought exclusively in the state or federal courts located in Hillsborough County, Florida, and you consent to personal jurisdiction in those courts.',
  },
  {
    title: '16. Contact',
    body: 'Questions about these Terms? Contact us at support@getworkforge.com or by mail at WorkForge, 11814 Whisper Creek Dr, Riverview, FL 33569.',
  },
]

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
        <span style={{ fontSize: 20, fontWeight: 800 }}><span style={{ color: 'var(--text)' }}>Work</span><span style={{ color: 'var(--amber)' }}>Forge</span></span>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ fontSize: 13, color: 'var(--text4)', marginBottom: 40 }}>Last updated: May 18, 2026</p>

      {SECTIONS.map(({ title, body }) => (
        <div key={title} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.7, margin: 0 }}>{body}</p>
        </div>
      ))}
    </div>
  )
}
