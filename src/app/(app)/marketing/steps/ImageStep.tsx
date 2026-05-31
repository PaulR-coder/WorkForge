'use client'

import { useState, useEffect, useRef } from 'react'
import type { SelectedVariation } from './CopyStep'

type Style = 'photo' | 'graphic' | 'illustration' | 'upload'

const STYLE_OPTIONS: { id: Style; label: string; icon: string }[] = [
  { id: 'photo', label: 'Photo Realistic', icon: '📷' },
  { id: 'graphic', label: 'Bold Graphic', icon: '🎨' },
  { id: 'illustration', label: 'Illustration', icon: '✏️' },
  { id: 'upload', label: 'Upload My Own', icon: '📁' },
]

interface Props {
  selected: SelectedVariation
  onBack: () => void
  onNext: (imageResult: { imageUrl?: string; imageBase64?: string } | null) => void
}

export default function ImageStep({ selected, onBack, onNext }: Props) {
  const [prompt, setPrompt] = useState('')
  const [promptLoading, setPromptLoading] = useState(true)
  const [style, setStyle] = useState<Style>('photo')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function fetchUsage() {
    fetch('/api/marketing/image/usage')
      .then((r) => r.json())
      .then((d: { used?: number; limit?: number }) => {
        if (typeof d.used === 'number' && typeof d.limit === 'number') {
          setUsage({ used: d.used, limit: d.limit })
        }
      })
      .catch(() => {})
  }

  useEffect(() => { fetchUsage() }, [])

  // Auto-generate prompt on mount
  useEffect(() => {
    setPromptLoading(true)
    fetch('/api/marketing/image/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: selected.tool, inputs: selected.inputs, selectedVariation: selected.variation }),
    })
      .then((r) => r.json())
      .then((d: { prompt?: string }) => setPrompt(d.prompt ?? ''))
      .catch(() => setPrompt(''))
      .finally(() => setPromptLoading(false))
  }, [selected])

  async function handleGenerate() {
    if (!prompt.trim() || style === 'upload') return
    setError('')
    setImageUrl(null)
    setGenerating(true)
    try {
      const res = await fetch('/api/marketing/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style }),
      })
      const data = await res.json() as { imageUrl?: string; error?: string }
      if (!res.ok || !data.imageUrl) { setError(data.error ?? 'Image generation failed'); return }
      setImageUrl(data.imageUrl)
      fetchUsage()
    } catch {
      setError('Network error generating image')
    } finally {
      setGenerating(false)
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImageBase64(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const hasImage = imageUrl || imageBase64

  const bg2 = 'var(--bg2)'
  const border = '1px solid var(--border)'

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Left: controls */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ background: bg2, border, borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>
            Image Prompt
          </div>
          {promptLoading ? (
            <div style={{ background: 'var(--bg3)', borderRadius: 10, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text4)', fontSize: 13 }}>
              Generating prompt suggestion…
            </div>
          ) : (
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate…"
              rows={4}
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, padding: '11px 14px', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', outline: 'none' }}
            />
          )}
        </div>

        {/* Style picker */}
        <div style={{ background: bg2, border, borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>Style</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {STYLE_OPTIONS.map((opt) => (
              <div
                key={opt.id}
                onClick={() => setStyle(opt.id)}
                style={{
                  border: style === opt.id ? '2px solid var(--amber)' : '1px solid var(--border)',
                  borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                  background: style === opt.id ? 'rgba(245,158,11,0.07)' : 'var(--bg3)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span>{opt.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: style === opt.id ? 'var(--amber)' : 'var(--text)' }}>{opt.label}</span>
              </div>
            ))}
          </div>

          {style === 'upload' && (
            <div style={{ marginTop: 14 }}>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              <button
                onClick={() => fileRef.current?.click()}
                style={{ width: '100%', background: 'var(--bg3)', border: '1px dashed var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {imageBase64 ? '✓ Image selected — click to change' : 'Choose image file…'}
              </button>
            </div>
          )}
        </div>

        {usage && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--text4)' }}>Images this month</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: usage.used >= usage.limit ? 'var(--red)' : usage.used >= usage.limit * 0.8 ? 'var(--amber)' : 'var(--text)' }}>
              {usage.used} / {usage.limit}
            </span>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            aria-label="Back"
            onClick={onBack}
            style={{ flex: 1, background: 'var(--bg3)', border, borderRadius: 10, padding: '13px 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ← Back
          </button>
          {style !== 'upload' && (
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              style={{ flex: 2, background: 'var(--amber)', color: '#050810', border: 'none', borderRadius: 10, padding: '13px 16px', fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-display)', cursor: generating || !prompt.trim() ? 'not-allowed' : 'pointer', opacity: generating || !prompt.trim() ? 0.5 : 1 }}
            >
              {generating ? 'Generating…' : '✨ Generate Image'}
            </button>
          )}
        </div>
      </div>

      {/* Right: preview */}
      <div style={{ width: 340, flexShrink: 0 }}>
        <div style={{ background: bg2, border, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ aspectRatio: '1', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {hasImage ? (
              <img src={imageUrl ?? imageBase64 ?? ''} alt="Generated" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text4)', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                <div>Image will appear here</div>
              </div>
            )}
          </div>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {hasImage && (
              <button
                onClick={() => onNext({ imageUrl: imageUrl ?? undefined, imageBase64: imageBase64 ?? undefined })}
                style={{ width: '100%', background: 'var(--amber)', color: '#050810', border: 'none', borderRadius: 10, padding: '13px 16px', fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-display)', cursor: 'pointer' }}
              >
                Use this image →
              </button>
            )}
            <button
              onClick={() => onNext(null)}
              style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text4)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: '4px 0', fontFamily: 'inherit' }}
            >
              Skip — post text only
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
