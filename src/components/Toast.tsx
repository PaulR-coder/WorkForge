'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const STYLE: Record<ToastType, { accent: string; icon: string }> = {
  success: { accent: 'var(--green)',  icon: '✓' },
  error:   { accent: 'var(--red)',    icon: '✕' },
  info:    { accent: '#5ba3f5',       icon: 'i' },
  warning: { accent: 'var(--amber)',  icon: '!' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = String(++counter.current)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3800)
  }, [])

  function dismiss(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const s = STYLE[t.type]
          return (
            <div key={t.id} style={{
              background: 'var(--bg2)',
              border: `1px solid var(--border)`,
              borderLeft: `3px solid ${s.accent}`,
              borderRadius: 10,
              padding: '11px 12px 11px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 6px 24px rgba(0,0,0,.5)',
              animation: 'toastIn .25s ease',
              pointerEvents: 'auto',
              minWidth: 240, maxWidth: 360,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: `${s.accent}20`, border: `1px solid ${s.accent}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 900, color: s.accent,
              }}>
                {s.icon}
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text2)', lineHeight: 1.4 }}>
                {t.message}
              </span>
              <button
                onClick={() => dismiss(t.id)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text4)', padding: '0 0 0 4px', lineHeight: 1, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes toastIn {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  )
}
