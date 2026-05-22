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
          <h1 className="legal-title">Terms of Service</h1>
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
