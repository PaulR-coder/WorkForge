'use client'

import { useState, useRef, useEffect } from 'react'
import { useLang } from '@/components/LangProvider'
import { useIsMobile } from '@/lib/useIsMobile'

// SVG method icons
function CardMethodIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  )
}

function CashMethodIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/>
      <circle cx="12" cy="12" r="3"/>
      <path d="M6 12h.01M18 12h.01"/>
    </svg>
  )
}

function CheckMethodIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
      <line x1="6" y1="15" x2="12" y2="15"/>
      <line x1="16" y1="15" x2="18" y2="15"/>
    </svg>
  )
}

function PhoneMethodIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  )
}

function SuccessCheckIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="9 12 11.5 14.5 15.5 9.5"/>
    </svg>
  )
}

const METHODS = [
  { id: 'card',    label: 'Card',    Icon: CardMethodIcon  },
  { id: 'cash',    label: 'Cash',    Icon: CashMethodIcon  },
  { id: 'check',   label: 'Check',   Icon: CheckMethodIcon },
  { id: 'digital', label: 'Digital', Icon: PhoneMethodIcon },
] as const

type MethodId = typeof METHODS[number]['id']

export default function PaymentOverlay({
  jobId,
  clientName,
  onClose,
  onSuccess,
}: {
  jobId?: string
  clientName: string
  onClose: () => void
  onSuccess: (amount: number) => void
}) {
  const isMobile = useIsMobile()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<MethodId>('card')
  const [cashTendered, setCashTendered] = useState('')
  const [step, setStep] = useState<'amount' | 'card' | 'signature' | 'done'>('amount')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [processing, setProcessing] = useState(false)
  const [payError, setPayError] = useState('')
  const [signature, setSignature] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const { t } = useLang()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || step !== 'signature') return
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.round(rect.width)
    canvas.height = Math.round(rect.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'

    function getPos(e: MouseEvent | TouchEvent) {
      const rect = canvas!.getBoundingClientRect()
      const src = 'touches' in e ? e.touches[0] : e
      return { x: src.clientX - rect.left, y: src.clientY - rect.top }
    }

    function onDown(e: MouseEvent | TouchEvent) {
      e.preventDefault()
      drawing.current = true
      const { x, y } = getPos(e)
      ctx!.beginPath()
      ctx!.moveTo(x, y)
    }
    function onMove(e: MouseEvent | TouchEvent) {
      e.preventDefault()
      if (!drawing.current) return
      const { x, y } = getPos(e)
      ctx!.lineTo(x, y)
      ctx!.stroke()
    }
    function onUp() {
      drawing.current = false
      setSignature(canvas!.toDataURL())
    }

    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseup', onUp)
    canvas.addEventListener('touchstart', onDown, { passive: false })
    canvas.addEventListener('touchmove', onMove, { passive: false })
    canvas.addEventListener('touchend', onUp)

    return () => {
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('touchstart', onDown)
      canvas.removeEventListener('touchmove', onMove)
      canvas.removeEventListener('touchend', onUp)
    }
  }, [step])

  function clearSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    setSignature('')
  }

  function formatCard(val: string) {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  }

  function formatExpiry(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 4)
    return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
  }

  async function processPayment() {
    setProcessing(true)
    setPayError('')

    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        method,
        amount: parseFloat(amount),
        signature: signature || null,
        notes: method === 'card' ? `Card ending ${cardNumber.replace(/\s/g, '').slice(-4)}` : method,
      }),
    })

    setProcessing(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setPayError(data.error ?? 'Payment failed. Please try again.')
      return
    }
    setStep('done')
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
    color: 'var(--text)', fontSize: 14, padding: '12px 14px', outline: 'none', fontFamily: 'var(--font-body)',
    minHeight: 48,
  }

  const amtNum = parseFloat(amount)
  const cardReady = cardNumber.replace(/\s/g, '').length === 16 && expiry.length >= 4 && cvv.length >= 3
  const cashNum = parseFloat(cashTendered)
  const change = cashNum > amtNum ? cashNum - amtNum : 0

  // Non-card methods skip the card step → go straight to signature
  function handleContinueFromAmount() {
    if (method === 'card') {
      setStep('card')
    } else {
      setStep('signature')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,.8)',
      zIndex: 1100,
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg2)',
        borderTop: '3px solid var(--amber)',
        border: `1px solid var(--border)`,
        borderRadius: isMobile ? '20px 20px 0 0' : 20,
        width: isMobile ? '100%' : 440,
        overflow: 'hidden',
        animation: 'slideUp .22s cubic-bezier(.16,1,.3,1)',
        boxShadow: 'var(--shadow-xl)',
        maxHeight: isMobile ? '96vh' : '90vh',
        overflowY: 'auto',
      }}>

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: 'rgba(34,197,94,.12)',
            border: '1px solid rgba(34,197,94,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--green)',
          }}>
            <CardMethodIcon size={19} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: .3 }}>
              {t('collectPaymentTitle')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 1 }}>{clientName}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: '50%', width: 34, height: 34,
              cursor: 'pointer', color: 'var(--text4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', padding: '0 22px', gap: 5, marginBottom: 6 }}>
          {['amount', 'card', 'signature', 'done'].map((s, i) => {
            const steps = method === 'card'
              ? ['amount', 'card', 'signature', 'done']
              : ['amount', 'signature', 'done']
            const stepIdx = steps.indexOf(step)
            const thisIdx = steps.indexOf(s)
            if (thisIdx === -1) return null
            return (
              <div
                key={s}
                style={{
                  flex: 1, height: 3, borderRadius: 10,
                  background: thisIdx <= stepIdx ? 'var(--green)' : 'var(--border)',
                  transition: 'background .3s',
                }}
              />
            )
          })}
        </div>

        <div style={{ padding: '12px 22px 26px' }}>

          {/* Step 1: Amount + Method */}
          {step === 'amount' && (
            <>
              {/* Amount */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
                {t('paymentAmount')}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12,
                padding: '14px 16px', marginBottom: 20, gap: 4,
              }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>$</span>
                <input
                  type="number" min="0" step="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    outline: 'none', color: amtNum > 0 ? 'var(--green)' : 'var(--text)',
                    fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                  }}
                />
              </div>

              {/* Payment method selection */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
                Payment Method
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {METHODS.map(({ id, label, Icon }) => {
                  const selected = method === id
                  return (
                    <button
                      key={id}
                      onClick={() => setMethod(id)}
                      style={{
                        padding: '14px 12px',
                        borderRadius: 12,
                        border: `2px solid ${selected ? 'var(--amber)' : 'var(--border)'}`,
                        background: selected ? 'var(--amber-dim)' : 'var(--bg3)',
                        color: selected ? 'var(--amber)' : 'var(--text3)',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                        transition: 'all .15s',
                        minHeight: 76,
                      }}
                    >
                      <Icon size={22} />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Cash change calculation */}
              {method === 'cash' && amtNum > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
                    Cash Tendered
                  </label>
                  <div style={{ position: 'relative', marginBottom: change > 0 ? 10 : 0 }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 700, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>$</span>
                    <input
                      type="number" min="0" step="0.01" value={cashTendered}
                      onChange={e => setCashTendered(e.target.value)}
                      placeholder="0.00"
                      style={{ ...inp, paddingLeft: 30 }}
                    />
                  </div>
                  {change > 0 && (
                    <div style={{
                      background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.25)',
                      borderRadius: 10, padding: '12px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Change due</span>
                      <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                        ${change.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleContinueFromAmount}
                disabled={!amtNum || amtNum <= 0}
                style={{
                  width: '100%', background: 'var(--amber)', color: '#080c1a',
                  border: 'none', borderRadius: 12,
                  fontSize: 15, fontWeight: 800, minHeight: 52,
                  cursor: 'pointer', opacity: (!amtNum || amtNum <= 0) ? 0.4 : 1,
                  fontFamily: 'var(--font-display)', letterSpacing: .4,
                }}
              >
                Continue · ${amtNum > 0 ? amtNum.toFixed(2) : '0.00'}
              </button>
            </>
          )}

          {/* Step 2: Card (only when method=card) */}
          {step === 'card' && (
            <>
              {/* Card preview */}
              <div style={{
                background: 'linear-gradient(135deg, #1a2a4a 0%, #0d1828 100%)',
                borderRadius: 14, padding: '18px 20px', marginBottom: 18,
                border: '1px solid var(--border2)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--amber)', fontFamily: 'var(--font-display)', letterSpacing: .5 }}>WorkForge Pay</div>
                  <CardMethodIcon size={20} />
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 700, color: '#e8eeff',
                  letterSpacing: 3, marginBottom: 16,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {cardNumber || '•••• •••• •••• ••••'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                  <div>
                    <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2, color: 'var(--text4)' }}>Expires</div>
                    <div>{expiry || 'MM/YY'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2, color: 'var(--text4)' }}>Amount</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>${parseFloat(amount).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>
                  {t('cardNumber')}
                </label>
                <input value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))} placeholder="1234 5678 9012 3456" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>{t('expiry')}</label>
                  <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>{t('cvv')}</label>
                  <input type="password" value={cvv} onChange={e => setCvv(e.target.value.slice(0, 4))} placeholder="•••" style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setStep('amount')}
                  style={{
                    padding: '12px 18px', background: 'transparent',
                    border: '1px solid var(--border)', borderRadius: 12,
                    color: 'var(--text3)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', minHeight: 48,
                  }}
                >
                  {t('back')}
                </button>
                <button
                  onClick={() => setStep('signature')}
                  disabled={!cardReady}
                  style={{
                    flex: 1, background: 'var(--amber)', color: '#080c1a',
                    border: 'none', borderRadius: 12,
                    fontSize: 14, fontWeight: 800, cursor: 'pointer',
                    opacity: !cardReady ? 0.4 : 1, minHeight: 48,
                  }}
                >
                  {t('continue')}
                </button>
              </div>
            </>
          )}

          {/* Step 3: Signature */}
          {step === 'signature' && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }}>
                {t('customerSignature')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
                {t('authorizeCharge')} <strong style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>${parseFloat(amount).toFixed(2)}</strong> {t('charge')}
              </div>
              <div style={{
                position: 'relative', marginBottom: 14,
                border: '2px solid var(--border)', borderRadius: 12,
                overflow: 'hidden',
                background: 'var(--bg3)',
              }}>
                <canvas
                  ref={canvasRef}
                  style={{ width: '100%', height: 140, display: 'block', touchAction: 'none', cursor: 'crosshair' }}
                />
                <button
                  onClick={clearSignature}
                  style={{
                    position: 'absolute', top: 8, right: 10,
                    background: 'var(--bg4)', border: '1px solid var(--border)',
                    borderRadius: 7, cursor: 'pointer',
                    fontSize: 11, color: 'var(--text4)', padding: '4px 9px', fontWeight: 600,
                  }}
                >
                  {t('clear')}
                </button>
                {!signature && (
                  <div style={{
                    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                    fontSize: 12, color: 'var(--text4)', pointerEvents: 'none', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    {t('signHere')}
                  </div>
                )}
              </div>

              {payError && (
                <div style={{
                  background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)',
                  borderRadius: 10, padding: '11px 14px',
                  fontSize: 13, color: 'var(--red)', marginBottom: 12,
                }}>
                  {payError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setStep(method === 'card' ? 'card' : 'amount')}
                  style={{
                    padding: '12px 18px', background: 'transparent',
                    border: '1px solid var(--border)', borderRadius: 12,
                    color: 'var(--text3)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', minHeight: 48,
                  }}
                >
                  {t('back')}
                </button>
                <button
                  onClick={processPayment}
                  disabled={processing}
                  style={{
                    flex: 1, background: 'var(--amber)', color: '#080c1a',
                    border: 'none', borderRadius: 12,
                    fontSize: 14, fontWeight: 800, cursor: 'pointer',
                    opacity: processing ? 0.7 : 1, minHeight: 52,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontFamily: 'var(--font-display)', letterSpacing: .4,
                  }}
                >
                  {processing ? (
                    <>
                      <span style={{ width: 16, height: 16, border: '2px solid rgba(8,12,26,.3)', borderTopColor: '#080c1a', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                      {t('processing')}
                    </>
                  ) : `Charge $${parseFloat(amount).toFixed(2)}`}
                </button>
              </div>
            </>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <div style={{ display: 'inline-flex', marginBottom: 16 }}>
                <SuccessCheckIcon />
              </div>
              <div style={{
                fontSize: 26, fontWeight: 800, color: 'var(--green)', marginBottom: 6,
                fontFamily: 'var(--font-display)', letterSpacing: .4,
              }}>
                Payment Collected
              </div>
              <div style={{
                fontSize: 32, fontWeight: 800, color: 'var(--text)',
                fontFamily: 'var(--font-mono)', marginBottom: 6,
              }}>
                ${parseFloat(amount).toFixed(2)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text4)', marginBottom: 24 }}>{t('paymentSuccess')}</div>
              <button
                onClick={() => { onSuccess(parseFloat(amount)); onClose() }}
                style={{
                  width: '100%', background: 'var(--amber)', color: '#080c1a',
                  border: 'none', borderRadius: 12,
                  fontSize: 15, fontWeight: 800, minHeight: 52,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-display)', letterSpacing: .4,
                }}
              >
                {t('done2')}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}
