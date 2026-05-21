'use client'

import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app-error]', error)
  }, [error])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: 32,
      textAlign: 'center', gap: 12,
    }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
        Something went wrong
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 320, lineHeight: 1.6 }}>
        An unexpected error occurred. Try again or go back to login.
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={reset} className="btn btn-primary btn-sm">Try again</button>
        <a href="/login" className="btn btn-secondary btn-sm">Back to login</a>
      </div>
    </div>
  )
}
