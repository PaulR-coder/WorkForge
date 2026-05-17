'use client'

import { useState, useRef, useEffect } from 'react'
import { useIsMobile } from '@/lib/useIsMobile'

const SUPPORT_URL = 'https://support-agent-production-085a.up.railway.app'

type Message = { role: 'user' | 'assistant'; content: string; isTicket?: boolean }

export default function SupportChat({ onClose }: { onClose: () => void }) {
  const isMobile = useIsMobile()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! Describe your issue and I'll help. If it's a bug, I'll log a ticket and our system will diagnose it automatically." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${SUPPORT_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.filter(m => !m.isTicket).map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? 'No response.', isTicket: !!data.ticketId }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        left: 8, right: 8,
        bottom: `calc(56px + env(safe-area-inset-bottom) + 8px)`,
        height: 420,
        borderRadius: 16,
        zIndex: 600,
      }
    : {
        position: 'fixed',
        left: 16,
        bottom: 80,
        width: 340,
        height: 440,
        borderRadius: 16,
        zIndex: 600,
      }

  return (
    <>
      {/* Backdrop (mobile only) */}
      {isMobile && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 599, background: 'rgba(0,0,0,.5)' }}
        />
      )}

      <div style={{
        ...panelStyle,
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 60px rgba(0,0,0,.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: '#2563eb', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>WorkForge Support</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.75)', marginTop: 1 }}>We usually reply instantly</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4, opacity: 0.8 }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg3)' }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              padding: '9px 12px',
              borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              background: m.role === 'user' ? '#2563eb' : m.isTicket ? 'rgba(34,197,94,.12)' : 'var(--bg2)',
              color: m.role === 'user' ? '#fff' : m.isTicket ? 'var(--green)' : 'var(--text)',
              border: m.role !== 'user' ? `1px solid ${m.isTicket ? 'rgba(34,197,94,.25)' : 'var(--border)'}` : 'none',
              fontSize: 12,
              lineHeight: 1.5,
            }}>
              {m.content}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start', padding: '9px 14px', borderRadius: '12px 12px 12px 2px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text4)', display: 'flex', gap: 4 }}>
              <span style={{ animation: 'pulse 1s ease infinite' }}>●</span>
              <span style={{ animation: 'pulse 1s ease infinite .2s' }}>●</span>
              <span style={{ animation: 'pulse 1s ease infinite .4s' }}>●</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, background: 'var(--bg2)', flexShrink: 0 }}>
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Describe your issue…"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 9, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={send} disabled={!input.trim() || loading}
            style={{ padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: (!input.trim() || loading) ? 0.5 : 1 }}>
            Send
          </button>
        </div>
      </div>
    </>
  )
}
