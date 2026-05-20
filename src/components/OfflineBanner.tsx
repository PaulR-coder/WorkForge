'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export function OfflineBanner() {
  const [online, setOnline]           = useState(true)
  const [pending, setPending]         = useState(0)
  const [syncing, setSyncing]         = useState(false)
  const [syncedCount, setSyncedCount] = useState(0)
  const [dataStale, setDataStale]     = useState(false)
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const askQueueCount = useCallback(() => {
    navigator.serviceWorker?.controller?.postMessage({ type: 'GET_QUEUE_COUNT' })
  }, [])

  useEffect(() => {
    setOnline(navigator.onLine)

    const onOnline = () => {
      setOnline(true)
      setSyncing(true)
      navigator.serviceWorker?.controller?.postMessage({ type: 'FLUSH_QUEUE' })
    }
    const onOffline = () => {
      setOnline(false)
      askQueueCount()
    }

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    const onSWMsg = (e: MessageEvent) => {
      if (e.data?.type === 'WF_SYNC_COMPLETE') {
        setSyncing(false)
        setSyncedCount(e.data.synced ?? 0)
        setPending(0)
        setDataStale(true)
        if (syncTimer.current) clearTimeout(syncTimer.current)
        syncTimer.current = setTimeout(() => {
          setSyncedCount(0)
          setDataStale(false)
        }, 6000)
      }
      if (e.data?.type === 'WF_QUEUE_COUNT') {
        setPending(e.data.count ?? 0)
      }
    }

    navigator.serviceWorker?.addEventListener('message', onSWMsg)

    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
      navigator.serviceWorker?.removeEventListener('message', onSWMsg)
      if (syncTimer.current) clearTimeout(syncTimer.current)
    }
  }, [askQueueCount])

  // Nothing to show
  if (online && !syncing && !dataStale && pending === 0) return null

  const bgColor  = !online ? 'rgba(239,68,68,.12)'   : syncing ? 'rgba(91,163,245,.1)' : 'rgba(34,197,94,.1)'
  const border   = !online ? 'rgba(239,68,68,.3)'    : syncing ? 'rgba(91,163,245,.3)' : 'rgba(34,197,94,.3)'
  const dotColor = !online ? '#ef4444'                : syncing ? '#5ba3f5'             : '#22c55e'

  const message = !online
    ? pending > 0
      ? `Offline — ${pending} change${pending !== 1 ? 's' : ''} will sync when reconnected`
      : 'Offline — viewing cached data'
    : syncing
    ? `Syncing ${pending > 0 ? `${pending} change${pending !== 1 ? 's' : ''}` : 'changes'}…`
    : syncedCount > 0
    ? `${syncedCount} change${syncedCount !== 1 ? 's' : ''} synced — refresh to see latest`
    : 'Back online'

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '9px 14px',
      background: bgColor,
      border: `1px solid ${border}`,
      borderRadius: 10,
      backdropFilter: 'blur(8px)',
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 20px rgba(0,0,0,.4)',
    }}>
      {/* Status dot */}
      <span style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: dotColor,
        flexShrink: 0,
        animation: syncing ? 'wf-pulse 1.2s ease-in-out infinite' : 'none',
      }} />

      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #e2e8f0)' }}>
        {message}
      </span>

      {dataStale && (
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '4px 10px',
            background: 'rgba(34,197,94,.2)',
            border: '1px solid rgba(34,197,94,.4)',
            borderRadius: 6,
            color: '#22c55e',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}>
          Refresh
        </button>
      )}

      <style>{`
        @keyframes wf-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: .3; }
        }
      `}</style>
    </div>
  )
}
