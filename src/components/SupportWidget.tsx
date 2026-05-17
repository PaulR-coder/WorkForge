'use client';

import { useEffect } from 'react';

export function SupportWidget() {
  useEffect(() => {
    const existing = document.getElementById('support-widget-script');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.id = 'support-widget-script';
    script.src = 'https://support-agent-production-085a.up.railway.app/api/embed/widget.js?v=3';
    script.async = true;
    document.body.appendChild(script);

    const style = document.createElement('style');
    style.id = 'support-widget-position-override';
    style.textContent = `
      /* Desktop: move to bottom-right so it clears the 200px left sidebar */
      #supportWidget {
        left: auto !important;
        right: 24px !important;
        bottom: 24px !important;
      }
      #chatWindow {
        left: auto !important;
        right: 0 !important;
      }

      /* Mobile: raise above the 56px bottom tab bar */
      @media (max-width: 767px) {
        #supportWidget {
          right: 16px !important;
          bottom: calc(56px + env(safe-area-inset-bottom) + 12px) !important;
        }
        #chatWindow {
          width: calc(100vw - 32px) !important;
          max-width: 360px !important;
          right: 0 !important;
          left: auto !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => { style.remove(); };
  }, []);

  return null;
}
