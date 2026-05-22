'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
  exiting?: boolean
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

function IconSuccess() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <polyline points="2,7 5.5,10.5 12,3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconError() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconInfo() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7" y1="6" x2="7" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7" cy="4" r="0.8" fill="currentColor" />
    </svg>
  )
}

function IconWarning() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5 L13 12.5 H1 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="7" y1="5.5" x2="7" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="10.5" r="0.7" fill="currentColor" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const STYLE: Record<ToastType, { accent: string; bg: string; Icon: () => React.ReactElement }> = {
  success: { accent: 'var(--green)',      bg: 'rgba(34,197,94,.1)',    Icon: IconSuccess },
  error:   { accent: 'var(--red)',        bg: 'rgba(239,68,68,.1)',    Icon: IconError   },
  info:    { accent: 'var(--blue-light)', bg: 'rgba(91,163,245,.1)',   Icon: IconInfo    },
  warning: { accent: 'var(--amber)',      bg: 'rgba(245,158,11,.1)',   Icon: IconWarning },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = String(++counter.current)
    setToasts(prev => [...prev, { id, message, type }])
    // start exit animation slightly before removal
    setTimeout(() => setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t)), 3400)
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3800)
  }, [])

  function dismiss(id: string) {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350)
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
        maxWidth: 380,
        minWidth: 0,
      }}>
        {toasts.map(t => {
          const s = STYLE[t.type]
          const Icon = s.Icon
          return (
            <div
              key={t.id}
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${s.accent}`,
                borderRadius: 10,
                padding: '11px 12px 11px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 8px 32px rgba(0,0,0,.55)',
                animation: t.exiting ? 'toastOut .35s ease forwards' : 'toastIn .25s ease',
                pointerEvents: 'auto',
                minWidth: 240,
                maxWidth: 380,
              }}
            >
              <div style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                flexShrink: 0,
                background: s.bg,
                border: `1px solid ${s.accent}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: s.accent,
              }}>
                <Icon />
              </div>
              <span style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text)',
                lineHeight: 1.45,
                fontFamily: 'var(--font-body)',
              }}>
                {t.message}
              </span>
              <button
                onClick={() => dismiss(t.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text4)',
                  padding: 4,
                  lineHeight: 1,
                  flexShrink: 0,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text2)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text4)')}
                aria-label="Dismiss notification"
              >
                <IconClose />
              </button>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes toastIn {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        @keyframes toastOut {
          from { transform: translateX(0);   opacity: 1; }
          to   { transform: translateX(110%); opacity: 0; }
        }
        @media (max-width: 600px) {
          /* On mobile, stack from top-right */
          [data-toast-container] {
            bottom: auto !important;
            top: 16px !important;
            right: 12px !important;
            left: 12px !important;
          }
        }
      `}</style>
    </ToastContext.Provider>
  )
}
