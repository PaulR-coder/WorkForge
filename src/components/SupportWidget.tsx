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

    // On mobile the bottom tab bar is 56px + safe-area; push widget above it
    const style = document.createElement('style');
    style.id = 'support-widget-position-override';
    style.textContent = `
      @media (max-width: 767px) {
        #supportWidget {
          bottom: calc(56px + env(safe-area-inset-bottom) + 12px) !important;
          left: 12px !important;
        }
        #chatWindow {
          bottom: 60px !important;
          width: calc(100vw - 24px) !important;
          max-width: 360px !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  return null;
}
