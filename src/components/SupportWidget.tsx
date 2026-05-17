'use client';

import { useEffect } from 'react';

declare global {
  interface Window { __wfSupportToggle?: () => void }
}

export function SupportWidget() {
  useEffect(() => {
    const existing = document.getElementById('support-widget-script');
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = 'support-widget-style';
    style.textContent = `
      /* Hide the script's own button — we render our own in the sidebar */
      #supportToggle { display: none !important; }

      /* Reposition chat window: above sidebar bottom section, left-aligned */
      #chatWindow {
        position: fixed !important;
        bottom: 80px !important;
        left: 16px !important;
        right: auto !important;
        width: 340px !important;
      }

      @media (max-width: 767px) {
        #chatWindow {
          left: 8px !important;
          right: 8px !important;
          width: auto !important;
          bottom: calc(56px + env(safe-area-inset-bottom) + 8px) !important;
        }
      }
    `;
    document.head.appendChild(style);

    const script = document.createElement('script');
    script.id = 'support-widget-script';
    script.src = 'https://support-agent-production-085a.up.railway.app/api/embed/widget.js?v=3';
    script.async = true;
    document.body.appendChild(script);

    // Expose toggle so the sidebar button can open/close the chat
    window.__wfSupportToggle = () => {
      const win = document.getElementById('chatWindow');
      const input = document.getElementById('chatInput') as HTMLInputElement | null;
      if (win) {
        win.classList.toggle('hidden');
        if (!win.classList.contains('hidden') && input) input.focus();
      }
    };

    return () => {
      style.remove();
      delete window.__wfSupportToggle;
    };
  }, []);

  return null;
}
