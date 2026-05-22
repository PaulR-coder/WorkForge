'use client'

import { useState, useRef, useEffect } from 'react'
import { useIsMobile } from '@/lib/useIsMobile'

const SUPPORT_URL = 'https://support-agent-production-085a.up.railway.app'

type Message = { role: 'user' | 'assistant'; content: string; isTicket?: boolean }

function BoltIcon() {
  return (
    <svg width="16" height="16" viewBox="-44 -44 88 88" fill="none">
      <path d="M -10 -28 L -22 6 L -2 6 L -8 30 L 22 -8 L 4 -8 L 12 -28 Z" fill="#080c1a" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1.5 7.5L13.5 2L8 13.5L7 8.5L1.5 7.5Z" fill="currentColor" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function TicketIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <polyline points="2,6.5 4.5,9 10,3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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
        height: 440,
        borderRadius: 18,
        zIndex: 600,
      }
    : {
        position: 'fixed',
        right: 20,
        bottom: 16,
        width: 348,
        height: 460,
        borderRadius: 18,
        zIndex: 600,
      }

  return (
    <>
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
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'chatSlideUp .2s ease',
      }}>

        {/* Header */}
        <div style={{
          background: 'var(--bg3)',
          borderBottom: '1px solid var(--border)',
          padding: '13px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 32,
            height: 32,
            background: 'var(--amber)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <BoltIcon />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
            }}>
              WorkForge Support
            </div>
            <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>
              Replies instantly
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg4)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text3)',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color .15s, background .15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'var(--bg4)' }}
            aria-label="Close support chat"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: 'var(--bg)',
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              {m.isTicket && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 10,
                  color: 'var(--green)',
                  marginBottom: 3,
                  fontWeight: 600,
                }}>
                  <TicketIcon />
                  Ticket logged
                </div>
              )}
              <div style={{
                maxWidth: '88%',
                padding: '9px 13px',
                borderRadius: m.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                background: m.role === 'user'
                  ? 'var(--amber)'
                  : m.isTicket
                    ? 'rgba(34,197,94,.1)'
                    : 'var(--bg3)',
                color: m.role === 'user'
                  ? '#080c1a'
                  : m.isTicket
                    ? 'var(--green)'
                    : 'var(--text)',
                border: m.role !== 'user'
                  ? `1px solid ${m.isTicket ? 'rgba(34,197,94,.25)' : 'var(--border)'}`
                  : 'none',
                fontSize: 12.5,
                lineHeight: 1.55,
                fontFamily: 'var(--font-body)',
                fontWeight: m.role === 'user' ? 600 : 400,
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{
              alignSelf: 'flex-start',
              padding: '10px 14px',
              borderRadius: '14px 14px 14px 3px',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              display: 'flex',
              gap: 5,
              alignItems: 'center',
            }}>
              {[0, 0.15, 0.3].map((delay, i) => (
                <div key={i} style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--text4)',
                  animation: `chatDot 1.1s ease infinite ${delay}s`,
                }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 8,
          background: 'var(--bg2)',
          flexShrink: 0,
          alignItems: 'flex-end',
        }}>
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Describe your issue…"
            style={{
              flex: 1,
              padding: '9px 13px',
              borderRadius: 10,
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 12.5,
              outline: 'none',
              fontFamily: 'var(--font-body)',
              resize: 'none',
              transition: 'border-color .15s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--amber-border)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              background: (!input.trim() || loading) ? 'var(--bg4)' : 'var(--amber)',
              color: (!input.trim() || loading) ? 'var(--text4)' : '#080c1a',
              border: '1px solid var(--border)',
              borderRadius: 10,
              cursor: loading ? 'wait' : (!input.trim() ? 'default' : 'pointer'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background .15s, color .15s',
            }}
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes chatSlideUp {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes chatDot {
          0%,100% { opacity: .3; transform: translateY(0); }
          50%      { opacity: 1;  transform: translateY(-3px); }
        }
      `}</style>
    </>
  )
}
