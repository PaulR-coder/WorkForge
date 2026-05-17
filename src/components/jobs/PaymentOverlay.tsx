'use client'

import { useState, useRef, useEffect } from 'react'
import { useLang } from '@/components/LangProvider'
import { useIsMobile } from '@/lib/useIsMobile'

export default function PaymentOverlay({
  jobId,
  clientName,
  onClose,
  onSuccess,
}: {
  jobId: string
  clientName: string
  onClose: () => void
  onSuccess: (amount: number) => void
}) {
  const isMobile = useIsMobile()
  const [amount, setAmount] = useState('')
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
    // Sync canvas pixel dimensions to its CSS dimensions so touch coords match
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
        method: 'card',
        amount: parseFloat(amount),
        signature: signature || null,
        notes: `Card ending ${cardNumber.replace(/\s/g, '').slice(-4)}`,
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
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text)', fontSize: 13, padding: '10px 12px', outline: 'none', fontFamily: 'inherit',
  }

  const amtNum = parseFloat(amount)
  const cardReady = cardNumber.replace(/\s/g, '').length === 16 && expiry.length >= 4 && cvv.length >= 3

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1100, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: isMobile ? '18px 18px 0 0' : 18, width: isMobile ? '100%' : 420, overflow: 'hidden', animation: 'fadeIn .2s ease', boxShadow: '0 24px 80px rgba(0,0,0,.6)', maxHeight: '95vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(34,197,94,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💳</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t('collectPaymentTitle')}</div>
            <div style={{ fontSize: 11, color: 'var(--text4)' }}>{clientName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text4)', padding: 4 }}>✕</button>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', padding: '10px 20px', gap: 4 }}>
          {['amount', 'card', 'signature', 'done'].map((s, i) => {
            const stepIdx = ['amount', 'card', 'signature', 'done'].indexOf(step)
            return (
              <div key={s} style={{ flex: 1, height: 3, borderRadius: 10, background: i <= stepIdx ? 'var(--green)' : 'var(--border)' }} />
            )
          })}
        </div>

        <div style={{ padding: '10px 20px 20px' }}>

          {/* Step 1: Amount */}
          {step === 'amount' && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>{t('paymentAmount')}</div>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, fontWeight: 700, color: 'var(--text3)' }}>$</span>
                <input
                  type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0.00" autoFocus
                  style={{ ...inp, paddingLeft: 26, fontSize: 20, fontWeight: 700, textAlign: 'right' }}
                />
              </div>
              <button onClick={() => setStep('card')} disabled={!amtNum || amtNum <= 0}
                style={{ width: '100%', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, padding: 13, cursor: 'pointer', opacity: (!amtNum || amtNum <= 0) ? 0.4 : 1 }}>
                {t('continue')} ${amtNum > 0 ? amtNum.toFixed(2) : '0.00'}
              </button>
            </>
          )}

          {/* Step 2: Card */}
          {step === 'card' && (
            <>
              {/* Card preview */}
              <div style={{ background: 'linear-gradient(135deg, #1a2a4a 0%, #0d1828 100%)', borderRadius: 12, padding: '16px 18px', marginBottom: 16, border: '1px solid var(--border2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>WorkForge Pay</div>
                  <div style={{ fontSize: 20 }}>💳</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#e8eeff', letterSpacing: 2, marginBottom: 14, fontFamily: 'monospace' }}>
                  {cardNumber || '•••• •••• •••• ••••'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                  <div>
                    <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Expires</div>
                    <div>{expiry || 'MM/YY'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Amount</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>${parseFloat(amount).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{t('cardNumber')}</label>
                <input value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))} placeholder="1234 5678 9012 3456" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{t('expiry')}</label>
                  <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{t('cvv')}</label>
                  <input type="password" value={cvv} onChange={e => setCvv(e.target.value.slice(0, 4))} placeholder="•••" style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep('amount')} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text3)', fontSize: 12, padding: '10px 16px', cursor: 'pointer' }}>{t('back')}</button>
                <button onClick={() => setStep('signature')} disabled={!cardReady}
                  style={{ flex: 1, background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, padding: 13, cursor: 'pointer', opacity: !cardReady ? 0.4 : 1 }}>
                  {t('continue')}
                </button>
              </div>
            </>
          )}

          {/* Step 3: Signature */}
          {step === 'signature' && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{t('customerSignature')}</div>
              <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 10 }}>{t('authorizeCharge')} ${parseFloat(amount).toFixed(2)} {t('charge')}</div>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <canvas ref={canvasRef}
                  style={{ width: '100%', height: 130, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, touchAction: 'none', cursor: 'crosshair', display: 'block' }} />
                <button onClick={clearSignature} style={{ position: 'absolute', top: 6, right: 8, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text4)' }}>{t('clear')}</button>
                {!signature && <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'var(--text4)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>{t('signHere')}</div>}
              </div>
              {payError && <div style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.22)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{payError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep('card')} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text3)', fontSize: 12, padding: '10px 16px', cursor: 'pointer' }}>{t('back')}</button>
                <button onClick={processPayment} disabled={processing}
                  style={{ flex: 1, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, padding: 13, cursor: 'pointer', opacity: processing ? 0.7 : 1 }}>
                  {processing ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                      {t('processing')}
                    </span>
                  ) : `Charge $${parseFloat(amount).toFixed(2)} →`}
                </button>
              </div>
            </>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', marginBottom: 6 }}>${parseFloat(amount).toFixed(2)} {t('paymentCollected')}</div>
              <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 20 }}>{t('paymentSuccess')}</div>
              <button onClick={() => { onSuccess(parseFloat(amount)); onClose() }}
                style={{ width: '100%', background: 'var(--amber)', color: '#080c1a', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, padding: 13, cursor: 'pointer' }}>
                {t('done2')}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
