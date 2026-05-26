import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accessibility — WorkForge',
  description: 'WorkForge accessibility statement — our commitment to WCAG 2.1 AA and how to report accessibility issues.',
}

const SECTIONS = [
  {
    title: 'Our Commitment',
    body: 'WorkForge is committed to making our platform usable by everyone, regardless of ability or assistive technology. We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA across our public-facing website and logged-in application. Accessibility is an ongoing effort — if you encounter a barrier, we want to know about it.',
  },
  {
    title: 'Standards',
    body: 'We target WCAG 2.1 Level AA as our baseline. This covers four principles:\n\n• Perceivable — information and interface components must be presentable to users in ways they can perceive (text alternatives for images, sufficient color contrast, no content that relies on color alone).\n• Operable — interface components and navigation must be operable via keyboard and assistive technology.\n• Understandable — information and operation of the UI must be understandable (clear labels, predictable navigation, error identification).\n• Robust — content must be robust enough to be interpreted by a wide variety of user agents, including assistive technologies.',
  },
  {
    title: 'What We\'ve Done',
    body: 'Across the WorkForge platform:\n\n• All form inputs have associated labels and autocomplete attributes where applicable.\n• Interactive elements (buttons, links) have descriptive accessible names.\n• Color contrast meets or exceeds a 4.5:1 ratio for normal text and 3:1 for large text in both light and dark themes.\n• Error messages are announced via role="alert" so screen readers surface them without requiring focus movement.\n• The login, registration, billing, and legal pages are fully keyboard-navigable via Tab/Shift+Tab and Enter.\n• Focus indicators are visible and meet the WCAG 2.1 AA non-text contrast requirement.\n• The platform respects prefers-reduced-motion — animations are disabled when the system setting is active.',
  },
  {
    title: 'Known Limitations',
    body: 'We are aware of the following areas that do not yet fully meet WCAG 2.1 AA:\n\n• Jobs Board — the drag-and-drop kanban interface is currently mouse-only. Keyboard-based job reordering is not yet supported. As a workaround, jobs can be reassigned via the job detail drawer, which is fully keyboard-accessible.\n• Schedule Calendar — the weekly grid view requires a mouse to drag jobs to timeslots. The mobile day-view list and the job drawer assignment field are fully accessible alternatives.\n• Data tables — some complex data grids (audit log, invoices) lack full ARIA table semantics. We are actively improving this.\n\nWe are working to resolve these limitations in upcoming releases.',
  },
  {
    title: 'Feedback & Contact',
    body: 'If you experience an accessibility barrier on WorkForge — or if a page or feature does not work with your assistive technology — please contact us:\n\nEmail: support@getworkforge.com\nSubject line: "Accessibility Feedback"\n\nPlease describe the page or feature you were trying to use, the assistive technology and browser you are using, and what you expected to happen. We aim to respond within 5 business days.',
  },
  {
    title: 'Third-Party Content',
    body: 'WorkForge integrates with Stripe for payment processing. The Stripe payment portal is governed by Stripe\'s own accessibility practices. We cannot guarantee the accessibility of third-party interfaces that appear within or alongside the platform.',
  },
  {
    title: 'This Statement',
    body: 'This accessibility statement was prepared on May 26, 2026, based on a self-assessment of the platform. We review and update this statement when significant changes are made to the platform.',
  },
]

export default function AccessibilityPage() {
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
            <Link href="/login" className="legal-back">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M12 7H2M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </Link>
          </div>
        </header>

        <div className="legal-body">
          <h1 className="legal-title">Accessibility</h1>
          <span className="legal-date">Last updated: May 26, 2026</span>
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
