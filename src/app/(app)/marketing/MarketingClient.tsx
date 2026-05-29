'use client'

import { useState } from 'react'
import CopyStep, { type ToolId, type SelectedVariation } from './steps/CopyStep'
import ImageStep from './steps/ImageStep'
import PublishStep from './steps/PublishStep'

type Step = 1 | 2 | 3

interface ImageResult {
  imageUrl?: string
  imageBase64?: string
}

interface Props {
  company: string
  name: string
}

const STEPS = [
  { n: 1, label: 'Copy' },
  { n: 2, label: 'Image' },
  { n: 3, label: 'Publish' },
]

export default function MarketingClient({ company }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [activeTool, setActiveTool] = useState<ToolId>('google_ad')
  const [selectedVariation, setSelectedVariation] = useState<SelectedVariation | null>(null)
  const [imageResult, setImageResult] = useState<ImageResult | null>(null)

  function handleCopyNext(selected: SelectedVariation) {
    setSelectedVariation(selected)
    setStep(2)
  }

  function handleImageNext(result: ImageResult | null) {
    setImageResult(result)
    setStep(3)
  }

  function handleStartOver() {
    setStep(1)
    setSelectedVariation(null)
    setImageResult(null)
  }

  const amber = 'var(--amber)'
  const bg2 = 'var(--bg2)'
  const border = '1px solid var(--border)'

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1140, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✨</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.4px', margin: 0 }}>
            AI Marketing Suite
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text4)', marginLeft: 52, lineHeight: 1.5 }}>
          Generate copy, create an image, and publish to your social accounts in three steps.
        </p>
      </div>

      {/* Step bar */}
      <div style={{ background: bg2, border, borderRadius: 14, padding: '18px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEPS.map((s, i) => {
          const done = step > s.n
          const active = step === s.n
          return (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: active ? amber : done ? 'rgba(245,158,11,0.3)' : 'var(--bg3)',
                  border: active ? 'none' : done ? 'none' : border,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800,
                  color: active ? '#050810' : done ? amber : 'var(--text4)',
                }}>
                  {done ? '✓' : s.n}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: active ? amber : done ? amber : 'var(--text4)' }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: done ? 'rgba(245,158,11,0.4)' : 'var(--bg3)', margin: '0 12px', marginBottom: 14 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      {step === 1 && (
        <CopyStep
          activeTool={activeTool}
          onToolChange={setActiveTool}
          company={company}
          onNext={handleCopyNext}
        />
      )}
      {step === 2 && selectedVariation && (
        <ImageStep
          selected={selectedVariation}
          onBack={() => setStep(1)}
          onNext={handleImageNext}
        />
      )}
      {step === 3 && selectedVariation && (
        <PublishStep
          selected={selectedVariation}
          imageUrl={imageResult?.imageUrl}
          imageBase64={imageResult?.imageBase64}
          onBack={() => setStep(2)}
          onStartOver={handleStartOver}
        />
      )}
    </div>
  )
}
