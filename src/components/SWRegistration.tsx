'use client'

import { useEffect } from 'react'

export function SWRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let reg: ServiceWorkerRegistration | null = null

    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((r) => {
        reg = r

        // When a new SW installs, tell it to skip waiting immediately
        r.addEventListener('updatefound', () => {
          const next = r.installing
          if (!next) return
          next.addEventListener('statechange', () => {
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              next.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })
      })
      .catch(() => {})

    // When the controller changes (new SW took over), let the user decide
    // when to reload — never auto-reload and wipe in-progress forms.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.dispatchEvent(new CustomEvent('wf-update-available'))
    })

    const flush = () => {
      const ctrl = navigator.serviceWorker.controller
      if (ctrl) ctrl.postMessage({ type: 'FLUSH_QUEUE' })
    }

    // Flush queued mutations when the device goes back online
    window.addEventListener('online', flush)

    // iOS Safari does not support Background Sync in the background.
    // Flushing on visibilitychange covers the common field scenario:
    // tech completes a job in a dead zone, drives somewhere with signal,
    // opens the app — mutations sync immediately on app foreground.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) flush()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.removeEventListener('online', flush)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return null
}
