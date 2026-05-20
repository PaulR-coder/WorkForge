'use client'

import { useEffect } from 'react'

export function SWRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        // When a new SW installs, prompt it to activate immediately
        reg.addEventListener('updatefound', () => {
          const next = reg.installing
          if (!next) return
          next.addEventListener('statechange', () => {
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW is ready — tell it to skip waiting, then notify UI
              next.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })

        // Flush queued offline mutations when connectivity returns
        const flush = () => {
          reg.active?.postMessage({ type: 'FLUSH_QUEUE' })
        }
        window.addEventListener('online', flush)
        return () => window.removeEventListener('online', flush)
      })
      .catch(() => {})

    // When a new SW takes over, let the user decide when to reload —
    // never auto-reload mid-shift and wipe in-progress forms.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.dispatchEvent(new CustomEvent('wf-update-available'))
    })
  }, [])

  return null
}
