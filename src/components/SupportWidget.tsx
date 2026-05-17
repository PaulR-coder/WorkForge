'use client';

import { useEffect } from 'react';

export function SupportWidget() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://support-agent-production-085a.up.railway.app/api/embed/widget.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return null;
}
