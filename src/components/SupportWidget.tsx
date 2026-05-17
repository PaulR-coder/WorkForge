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
  }, []);

  return null;
}
