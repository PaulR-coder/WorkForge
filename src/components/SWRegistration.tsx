'use client'

import { useEffect } from 'react'

// Registers /sw.js and handles the update lifecycle.
// When a new SW installs and takes over, the page reloads once to apply it.
export function SWRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let refreshing = false

    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Prompt the new SW to skip waiting when it installs
        reg.addEventListener('updatefound', () => {
          const next = reg.installing
          if (!next) return
          next.addEventListener('statechange', () => {
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              next.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })

        // Flush any queued offline mutations once we're online
        const flush = () => {
          if (reg.active) reg.active.postMessage({ type: 'FLUSH_QUEUE' })
        }
        window.addEventListener('online', flush)
        return () => window.removeEventListener('online', flush)
      })
      .catch(() => {})

    // When the SW controller changes (new SW took over), reload once
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  return null
}
