'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

type BannerMode = 'hidden' | 'offline' | 'server-down' | 'syncing' | 'synced'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000)     return 'just now'
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export function OfflineBanner() {
  const [mode, setMode]                   = useState<BannerMode>('hidden')
  const [pending, setPending]             = useState(0)
  const [syncedCount, setSyncedCount]     = useState(0)
  const [conflictCount, setConflictCount] = useState(0)
  const [staleSince, setStaleSince]       = useState<number | null>(null)
  const [updateReady, setUpdateReady]     = useState(false)

  const synceTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const healthTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Helpers ─────────────────────────────────────────────────────────────

  const askQueueCount = useCallback(() => {
    navigator.serviceWorker?.controller?.postMessage({ type: 'GET_QUEUE_COUNT' })
  }, [])

  const checkServerHealth = useCallback(async () => {
    if (!navigator.onLine) return
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(4000), cache: 'no-store' })
      if (res.ok) {
        localStorage.setItem('wf-last-sync', Date.now().toString())
        // Only clear server-down — don't override offline state
        setMode(prev => prev === 'server-down' ? 'hidden' : prev)
        setStaleSince(null)
      } else {
        throw new Error('unhealthy')
      }
    } catch {
      const last = localStorage.getItem('wf-last-sync')
      setStaleSince(last ? parseInt(last) : null)
      setMode('server-down')
    }
  }, [])

  const clearSyncedBanner = useCallback(() => {
    if (synceTimer.current) clearTimeout(synceTimer.current)
    synceTimer.current = setTimeout(() => {
      setMode(prev => prev === 'synced' ? 'hidden' : prev)
      setSyncedCount(0)
    }, 6000)
  }, [])

  // ── Lifecycle ────────────────────────────────────────────────────────────

  useEffect(() => {
    setMode(navigator.onLine ? 'hidden' : 'offline')
    if (navigator.onLine) checkServerHealth()

    const onOffline = () => {
      setMode('offline')
      askQueueCount()
    }

    const onOnline = () => {
      localStorage.setItem('wf-last-sync', Date.now().toString())
      setStaleSince(null)
      setMode('syncing')
      // SW will flush automatically (SWRegistration handles it),
      // but also clear server-down health interval
      if (healthTimer.current) {
        clearInterval(healthTimer.current)
        healthTimer.current = null
      }
    }

    const onSWMsg = (e: MessageEvent) => {
      switch (e.data?.type) {
        case 'WF_SYNC_COMPLETE':
          setSyncedCount(e.data.synced ?? 0)
          setConflictCount(e.data.conflicts ?? 0)
          setPending(e.data.remaining ?? 0)
          setMode('synced')
          clearSyncedBanner()
          break

        case 'WF_QUEUE_COUNT':
          setPending(e.data.count ?? 0)
          break

        case 'WF_STALE_PAGE':
        case 'WF_STALE_API':
          // SW served cached content — update stale timestamp
          if (e.data.cachedAt) setStaleSince(e.data.cachedAt)
          break

        case 'WF_CONFLICTS':
          setConflictCount((e.data.conflicts ?? []).length)
          break
      }
    }

    const onUpdateAvailable = () => setUpdateReady(true)

    window.addEventListener('offline', onOffline)
    window.addEventListener('online',  onOnline)
    window.addEventListener('wf-update-available', onUpdateAvailable)
    navigator.serviceWorker?.addEventListener('message', onSWMsg)

    // Poll server health every 45s when online (detect Railway downtime)
    healthTimer.current = setInterval(() => {
      if (navigator.onLine) checkServerHealth()
    }, 45_000)

    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('wf-update-available', onUpdateAvailable)
      navigator.serviceWorker?.removeEventListener('message', onSWMsg)
      if (healthTimer.current)  clearInterval(healthTimer.current)
      if (synceTimer.current)   clearTimeout(synceTimer.current)
    }
  }, [askQueueCount, checkServerHealth, clearSyncedBanner])

  // ── Render ───────────────────────────────────────────────────────────────

  const showBanner = mode !== 'hidden' || updateReady || conflictCount > 0

  if (!showBanner) return null

  return (
    <>
      {/* App-update strip — persists until user reloads */}
      {updateReady && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
          background: '#1e293b', borderBottom: '1px solid rgba(91,163,245,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: '9px 16px',
        }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            WorkForge was updated — reload to apply changes
          </span>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '5px 12px', background: '#5ba3f5', border: 'none',
              borderRadius: 6, color: '#080c1a', fontSize: 11, fontWeight: 800, cursor: 'pointer',
            }}>
            Reload now
          </button>
          <button
            onClick={() => setUpdateReady(false)}
            aria-label="Dismiss"
            style={{
              padding: '4px 8px', background: 'transparent', border: 'none',
              color: '#64748b', fontSize: 14, cursor: 'pointer',
            }}>
            ✕
          </button>
        </div>
      )}

      {/* Conflict warning */}
      {conflictCount > 0 && (
        <div style={{
          position: 'fixed', bottom: mode !== 'hidden' ? 60 : 16,
          left: '50%', transform: 'translateX(-50%)', zIndex: 9998,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 14px',
          background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)',
          borderRadius: 10, backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 20px rgba(0,0,0,.4)', whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: 13 }}>⚠️</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fca5a5' }}>
            {conflictCount} change{conflictCount !== 1 ? 's' : ''} couldn't sync — job was modified by someone else
          </span>
          <button
            onClick={() => setConflictCount(0)}
            aria-label="Dismiss"
            style={{ padding: '2px 6px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

      {/* Main status pill */}
      {mode !== 'hidden' && (
        <StatusPill
          mode={mode}
          pending={pending}
          syncedCount={syncedCount}
          staleSince={staleSince}
          onRefresh={() => window.location.reload()}
        />
      )}

      <style>{`
        @keyframes wf-pulse { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes wf-spin   { to{transform:rotate(360deg)} }
      `}</style>
    </>
  )
}

// ── Extracted pill so the main component stays readable ────────────────────

function StatusPill({
  mode, pending, syncedCount, staleSince, onRefresh,
}: {
  mode: BannerMode
  pending: number
  syncedCount: number
  staleSince: number | null
  onRefresh: () => void
}) {
  const cfg = {
    offline:     { bg: 'rgba(239,68,68,.12)',   border: 'rgba(239,68,68,.3)',   dot: '#ef4444',  pulse: true,  spin: false },
    'server-down': { bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.3)', dot: '#f59e0b',  pulse: true,  spin: false },
    syncing:     { bg: 'rgba(91,163,245,.1)',   border: 'rgba(91,163,245,.3)', dot: '#5ba3f5',  pulse: false, spin: true  },
    synced:      { bg: 'rgba(34,197,94,.1)',    border: 'rgba(34,197,94,.3)',  dot: '#22c55e',  pulse: false, spin: false },
    hidden:      { bg: '', border: '', dot: '', pulse: false, spin: false },
  }[mode]

  const message =
    mode === 'offline'
      ? pending > 0
        ? `Offline — ${pending} change${pending !== 1 ? 's' : ''} queued`
        : 'Offline — viewing cached data'
    : mode === 'server-down'
      ? staleSince
        ? `Server unreachable — cached data from ${timeAgo(staleSince)}`
        : 'Server unreachable — viewing cached data'
    : mode === 'syncing'
      ? `Syncing ${pending > 0 ? `${pending} change${pending !== 1 ? 's' : ''}` : ''}…`.trim()
    : /* synced */
      `${syncedCount} change${syncedCount !== 1 ? 's' : ''} synced`

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8,
      padding: '9px 14px',
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 10, backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 20px rgba(0,0,0,.4)', whiteSpace: 'nowrap',
    }}>
      {cfg.spin ? (
        <span style={{ width: 9, height: 9, border: `2px solid ${cfg.dot}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'wf-spin .7s linear infinite', flexShrink: 0 }} />
      ) : (
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0, animation: cfg.pulse ? 'wf-pulse 1.4s ease-in-out infinite' : 'none' }} />
      )}

      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #e2e8f0)' }}>
        {message}
      </span>

      {mode === 'synced' && (
        <button
          onClick={onRefresh}
          style={{
            padding: '4px 10px', background: 'rgba(34,197,94,.2)',
            border: '1px solid rgba(34,197,94,.4)',
            borderRadius: 6, color: '#22c55e', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>
          Refresh
        </button>
      )}
    </div>
  )
}
