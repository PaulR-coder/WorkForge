'use client'

import { useState } from 'react'
import SupportChat from './SupportChat'

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path
        d="M11 2C6.03 2 2 5.8 2 10.5c0 2.1.8 4 2.1 5.5L3 20l4.5-1.3C8.9 19.5 9.9 19.7 11 19.7 15.97 19.7 20 16 20 10.5S15.97 2 11 2Z"
        fill="currentColor"
        opacity=".9"
      />
      <circle cx="7.5" cy="10.5" r="1.2" fill="#080c1a" />
      <circle cx="11" cy="10.5" r="1.2" fill="#080c1a" />
      <circle cx="14.5" cy="10.5" r="1.2" fill="#080c1a" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <line x1="2" y1="2" x2="16" y2="16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="16" y1="2" x2="2" y2="16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function SupportWidget() {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

  return (
    <>
      {open && <SupportChat onClose={() => setOpen(false)} />}

      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
        style={{
          position: 'fixed',
          left: 16,
          bottom: 20,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--amber)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#080c1a',
          zIndex: 601,
          boxShadow: hovered
            ? '0 0 0 6px rgba(245,158,11,.18), 0 8px 24px rgba(245,158,11,.35)'
            : '0 4px 16px rgba(245,158,11,.25)',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform .2s ease, box-shadow .2s ease',
        }}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </>
  )
}
