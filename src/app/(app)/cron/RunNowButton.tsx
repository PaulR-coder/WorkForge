'use client'

import { useState } from 'react'

type RunResult = {
  ok: boolean
  ranAt?: string
  error?: string
  results?: {
    pmAlerts: { processed: number; errors: string[] }
    invoiceReminders: { processed: number; errors: string[] }
    contractRenewals: { processed: number; errors: string[] }
  }
}

export function RunNowButton() {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<RunResult | null>(null)

  async function handleRun() {
    setState('running')
    setResult(null)
    try {
      const res = await fetch('/api/cron')
      const data: RunResult = await res.json()
      setResult(data)
      setState(data.ok ? 'done' : 'error')
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Network error' })
      setState('error')
    }
  }

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: state === 'running' ? 'wait' : 'pointer',
    border: 'none',
    fontFamily: 'inherit',
    transition: 'opacity .15s',
    opacity: state === 'running' ? 0.6 : 1,
  }

  return (
    <div>
      <button
        onClick={handleRun}
        disabled={state === 'running'}
        style={{
          ...btnBase,
          background: 'var(--amber)',
          color: '#050810',
        }}
      >
        {state === 'running' ? (
          <>
            <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
            </svg>
            Running…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Run Workers Now
          </>
        )}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Result panel */}
      {result && (
        <div style={{
          marginTop: 16,
          background: result.ok ? 'rgba(34,197,94,.07)' : 'rgba(239,68,68,.07)',
          border: `1px solid ${result.ok ? 'rgba(34,197,94,.22)' : 'rgba(239,68,68,.22)'}`,
          borderRadius: 12,
          padding: '16px 20px',
          maxWidth: 560,
        }}>
          {result.ok && result.results ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>✅</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                  Workers completed at {result.ranAt ? new Date(result.ranAt).toLocaleTimeString() : '—'}
                </span>
              </div>
              {(
                [
                  ['🔧', 'PM Alerts', result.results.pmAlerts],
                  ['💰', 'Invoice Reminders', result.results.invoiceReminders],
                  ['📑', 'Contract Renewals', result.results.contractRenewals],
                ] as const
              ).map(([icon, label, r]) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
                  fontSize: 13, color: 'var(--text)',
                }}>
                  <span>{icon}</span>
                  <span style={{ flex: 1 }}>{label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--green)' }}>
                    {r.processed} processed
                  </span>
                  {r.errors.length > 0 && (
                    <span style={{ color: 'var(--red)', fontWeight: 700 }}>
                      {r.errors.length} error{r.errors.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              ))}
              {/* Show error details if any */}
              {[...result.results.pmAlerts.errors, ...result.results.invoiceReminders.errors, ...result.results.contractRenewals.errors].length > 0 && (
                <details style={{ marginTop: 10 }}>
                  <summary style={{ fontSize: 12, color: 'var(--red)', cursor: 'pointer', fontWeight: 600 }}>
                    View error details
                  </summary>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                    {[...result.results.pmAlerts.errors, ...result.results.invoiceReminders.errors, ...result.results.contractRenewals.errors].map((e, i) => (
                      <li key={i} style={{ fontSize: 11, color: 'var(--red)', marginBottom: 3, fontFamily: 'monospace' }}>{e}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>❌</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 2 }}>
                  Workers failed
                </div>
                <div style={{ fontSize: 12, color: 'var(--text4)', fontFamily: 'monospace' }}>
                  {result.error}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
