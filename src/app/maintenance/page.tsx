export default function MaintenancePage() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:    #060a17;
          --bg2:   #0a0f1e;
          --bg3:   #111827;
          --text:  #f0f4ff;
          --text2: #a8b8cc;
          --text3: #7a8fa6;
          --amber: #f59e0b;
          --amber-dim:    rgba(245,158,11,.13);
          --amber-border: rgba(245,158,11,.28);
          --border: rgba(255,255,255,.09);
        }

        html, body {
          height: 100%;
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        @keyframes gridPulse {
          0%, 100% { opacity: .04; }
          50%       { opacity: .07; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: .35; }
          50%       { opacity: .55; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .maint-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 24px;
          position: relative;
          overflow: hidden;
        }

        .maint-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: gridPulse 5s ease infinite;
          pointer-events: none;
        }

        .maint-glow {
          position: absolute;
          top: 25%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(245,158,11,.14) 0%, transparent 65%);
          animation: glowPulse 4s ease infinite;
          pointer-events: none;
        }

        .maint-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }

        .maint-logo-wrap {
          width: 72px;
          height: 72px;
          border-radius: 18px;
          background: var(--amber);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 12px var(--amber-dim), 0 8px 32px rgba(245,158,11,.35);
          animation: fadeUp .5s ease both, spin 8s linear infinite;
          margin-bottom: 36px;
        }

        .maint-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 14px;
          border-radius: 100px;
          border: 1px solid var(--amber-border);
          background: var(--amber-dim);
          font-size: 11px;
          font-weight: 700;
          color: var(--amber);
          letter-spacing: .08em;
          text-transform: uppercase;
          margin-bottom: 20px;
          animation: fadeUp .45s ease .1s both;
        }

        .maint-heading {
          font-family: 'Barlow Condensed', 'DM Sans', system-ui, sans-serif;
          font-size: clamp(42px, 8vw, 72px);
          font-weight: 800;
          line-height: .95;
          letter-spacing: -.01em;
          text-transform: uppercase;
          color: var(--text);
          margin-bottom: 16px;
          animation: fadeUp .45s ease .2s both;
        }

        .maint-heading-accent { color: var(--amber); }

        .maint-sub {
          font-size: clamp(14px, 2.5vw, 17px);
          color: var(--text3);
          max-width: 400px;
          line-height: 1.65;
          margin-bottom: 48px;
          animation: fadeUp .45s ease .3s both;
        }

        .maint-divider {
          width: 40px;
          height: 3px;
          border-radius: 2px;
          background: var(--amber-border);
          margin-bottom: 28px;
          animation: fadeUp .45s ease .35s both;
        }

        .maint-footer {
          font-size: 12px;
          color: var(--text3);
          display: flex;
          align-items: center;
          gap: 8px;
          animation: fadeUp .45s ease .4s both;
        }

        .maint-footer-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--amber);
          opacity: .7;
        }

        .maint-wordmark {
          font-family: 'Barlow Condensed', 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .05em;
          text-transform: uppercase;
          color: var(--text3);
        }
        .maint-wordmark span { color: var(--amber); }
      `}</style>

      <div className="maint-root">
        <div className="maint-grid" aria-hidden="true" />
        <div className="maint-glow" aria-hidden="true" />

        <div className="maint-content">
          {/* Spinning bolt logo */}
          <div className="maint-logo-wrap" aria-hidden="true">
            <svg width="36" height="36" viewBox="-44 -44 88 88" fill="none">
              <path
                d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z"
                fill="#080c1a"
              />
            </svg>
          </div>

          {/* Badge */}
          <div className="maint-badge">
            <svg width="9" height="9" viewBox="-44 -44 88 88" fill="none" aria-hidden="true">
              <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="currentColor" />
            </svg>
            Scheduled maintenance
          </div>

          {/* Heading */}
          <h1 className="maint-heading">
            Down for<br />
            <span className="maint-heading-accent">Maintenance</span>
          </h1>

          {/* Subtext */}
          <p className="maint-sub">
            We&rsquo;ll be back shortly. Our team is working to get things up and running as fast as possible.
          </p>

          <div className="maint-divider" aria-hidden="true" />

          {/* Footer wordmark */}
          <div className="maint-footer">
            <div className="maint-footer-dot" aria-hidden="true" />
            <span className="maint-wordmark">Work<span>Forge</span></span>
          </div>
        </div>
      </div>
    </>
  )
}
