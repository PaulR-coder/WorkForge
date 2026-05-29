'use client'

import { useState, useEffect } from 'react'

export type ToolId =
  | 'google_ad' | 'facebook_ad' | 'email_campaign'
  | 'service_description' | 'social_post' | 'review_response'

const TOOLS = [
  { id: 'google_ad' as ToolId, icon: '📢', name: 'Google Ads', description: 'Search ad headlines & descriptions' },
  { id: 'social_post' as ToolId, icon: '📱', name: 'Social Media', description: 'Platform-specific post variations' },
  { id: 'email_campaign' as ToolId, icon: '📧', name: 'Email Campaign', description: 'Subject lines & email body copy' },
  { id: 'service_description' as ToolId, icon: '🏢', name: 'Service Page', description: 'SEO-optimized service descriptions' },
  { id: 'review_response' as ToolId, icon: '👍', name: 'Review Response', description: 'Professional replies to customer reviews' },
  { id: 'facebook_ad' as ToolId, icon: '📣', name: 'Facebook/Instagram', description: 'Paid social ad copy' },
]

interface FieldDef {
  key: string
  label: string
  placeholder: string
  type: 'text' | 'select' | 'textarea'
  options?: string[]
}

const TOOL_FIELDS: Record<ToolId, FieldDef[]> = {
  google_ad: [
    { key: 'businessName', label: 'Business Name', placeholder: 'Acme HVAC', type: 'text' },
    { key: 'service', label: 'Service', placeholder: 'AC repair…', type: 'text' },
    { key: 'location', label: 'Service Area', placeholder: 'Austin, TX', type: 'text' },
    { key: 'callToAction', label: 'Call to Action', placeholder: 'Call today…', type: 'text' },
  ],
  facebook_ad: [
    { key: 'businessName', label: 'Business Name', placeholder: 'Acme HVAC', type: 'text' },
    { key: 'service', label: 'Service', placeholder: 'HVAC tune-up…', type: 'text' },
    { key: 'targetAudience', label: 'Target Audience', placeholder: 'Homeowners 35-65…', type: 'text' },
    { key: 'offer', label: 'Offer / Promotion', placeholder: '$50 off first service…', type: 'text' },
  ],
  email_campaign: [
    { key: 'businessName', label: 'Business Name', placeholder: 'Acme HVAC', type: 'text' },
    { key: 'campaignType', label: 'Campaign Type', placeholder: '', type: 'select', options: ['Seasonal tune-up reminder', 'New customer welcome', 'Service promotion', 'Maintenance plan upsell', 'Re-engagement', 'Holiday offer', 'Referral program'] },
    { key: 'offer', label: 'Offer / Key Message', placeholder: '20% off furnace tune-up…', type: 'text' },
    { key: 'tone', label: 'Tone', placeholder: '', type: 'select', options: ['Professional', 'Friendly & Casual', 'Urgent', 'Educational', 'Warm & Personal'] },
  ],
  service_description: [
    { key: 'businessName', label: 'Business Name', placeholder: 'Acme HVAC', type: 'text' },
    { key: 'service', label: 'Service', placeholder: 'Residential AC installation…', type: 'text' },
    { key: 'differentiators', label: 'What Makes You Different', placeholder: '24/7 availability, NATE-certified…', type: 'text' },
  ],
  social_post: [
    { key: 'businessName', label: 'Business Name', placeholder: 'Acme HVAC', type: 'text' },
    { key: 'platform', label: 'Platform', placeholder: '', type: 'select', options: ['Facebook', 'Instagram', 'LinkedIn', 'Twitter/X'] },
    { key: 'topic', label: 'Topic / Theme', placeholder: 'Summer AC maintenance tips…', type: 'text' },
    { key: 'tone', label: 'Tone', placeholder: '', type: 'select', options: ['Educational', 'Promotional', 'Behind-the-Scenes', 'Seasonal', 'Community-focused'] },
  ],
  review_response: [
    { key: 'businessName', label: 'Business Name', placeholder: 'Acme HVAC', type: 'text' },
    { key: 'rating', label: 'Star Rating', placeholder: '', type: 'select', options: ['5 — Excellent', '4 — Good', '3 — Average', '2 — Poor', '1 — Terrible'] },
    { key: 'review', label: 'Customer Review Text', placeholder: "Paste the customer's review here…", type: 'textarea' },
  ],
}

interface SectionDef { key: string; label: string; limit?: number }
const TOOL_SECTIONS: Record<ToolId, SectionDef[]> = {
  google_ad: [
    { key: 'headline1', label: 'Headline 1', limit: 30 },
    { key: 'headline2', label: 'Headline 2', limit: 30 },
    { key: 'headline3', label: 'Headline 3', limit: 30 },
    { key: 'description1', label: 'Description 1', limit: 90 },
    { key: 'description2', label: 'Description 2', limit: 90 },
  ],
  facebook_ad: [
    { key: 'primaryText', label: 'Primary Text', limit: 125 },
    { key: 'headline', label: 'Headline', limit: 40 },
    { key: 'linkDescription', label: 'Link Description', limit: 30 },
  ],
  social_post: [
    { key: 'caption', label: 'Caption' },
    { key: 'hashtags', label: 'Hashtags' },
  ],
  email_campaign: [
    { key: 'subjectLine', label: 'Subject Line', limit: 60 },
    { key: 'previewText', label: 'Preview Text', limit: 90 },
    { key: 'body', label: 'Body' },
  ],
  service_description: [
    { key: 'pageHeadline', label: 'Page Headline' },
    { key: 'bodyCopy', label: 'Body Copy' },
    { key: 'metaDescription', label: 'Meta Description', limit: 160 },
  ],
  review_response: [
    { key: 'response', label: 'Response' },
  ],
}

const SOCIAL_PLATFORM_LIMITS: Record<string, number> = {
  Instagram: 2200,
  Facebook: 63206,
  LinkedIn: 700,
  'Twitter/X': 280,
}

function getCharBadgeColor(len: number, limit: number): string {
  if (len > limit) return '#ef4444'
  if (len >= limit - 5) return '#f59e0b'
  return '#22c55e'
}

export interface SelectedVariation {
  tool: ToolId
  inputs: Record<string, string>
  variation: Record<string, unknown>
}

interface Props {
  activeTool: ToolId
  onToolChange: (tool: ToolId) => void
  company: string
  onNext: (selected: SelectedVariation) => void
}

export default function CopyStep({ activeTool, onToolChange, company, onNext }: Props) {
  const [inputs, setInputs] = useState<Record<string, string>>({ businessName: company })
  const [variations, setVariations] = useState<Record<string, unknown>[]>([])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [editedVariations, setEditedVariations] = useState<Record<string, unknown>[]>([])
  const [editingField, setEditingField] = useState<{ varIdx: number; key: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setInputs({ businessName: company })
    setVariations([])
    setSelectedIdx(null)
    setError('')
  }, [activeTool, company])

  const fields = TOOL_FIELDS[activeTool]
  const sections = TOOL_SECTIONS[activeTool]
  const canGenerate = fields.every((f) => (inputs[f.key] ?? '').trim().length > 0)

  async function handleGenerate() {
    setError('')
    setVariations([])
    setSelectedIdx(null)
    setLoading(true)

    const normalizedInputs = { ...inputs }
    if (normalizedInputs.rating) {
      normalizedInputs.rating = normalizedInputs.rating.split(' —')[0].trim()
    }

    try {
      const res = await fetch('/api/marketing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: activeTool, inputs: normalizedInputs }),
      })
      const data = await res.json() as { variations?: Record<string, unknown>[]; error?: string }
      if (!res.ok || !data.variations) {
        setError(data.error ?? 'Generation failed. Please try again.')
        return
      }
      setVariations(data.variations)
      setEditedVariations(data.variations.map((v) => ({ ...v })))
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  function getVariationPreview(v: Record<string, unknown>): string {
    const first = Object.values(v).find((val) => typeof val === 'string' && (val as string).length > 0)
    return first ? String(first).slice(0, 80) : 'Variation'
  }

  function getFieldValue(v: Record<string, unknown>, key: string): string {
    const val = v[key]
    if (Array.isArray(val)) return val.join(', ')
    return String(val ?? '')
  }

  function getSectionLimit(section: SectionDef): number | undefined {
    if (section.key === 'caption' && activeTool === 'social_post') {
      return SOCIAL_PLATFORM_LIMITS[inputs.platform ?? '']
    }
    return section.limit
  }

  function handleFieldEdit(varIdx: number, key: string, value: string) {
    setEditedVariations((prev) => {
      const next = [...prev]
      next[varIdx] = { ...next[varIdx], [key]: value }
      return next
    })
  }

  function handleNext() {
    if (selectedIdx === null) return
    onNext({
      tool: activeTool,
      inputs,
      variation: editedVariations[selectedIdx] ?? variations[selectedIdx],
    })
  }

  const bg2 = 'var(--bg2)'
  const border = '1px solid var(--border)'
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 10, color: 'var(--text)', fontSize: 14, padding: '11px 14px',
    fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text4)',
    textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6,
  }

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Sidebar */}
      <div style={{ width: 240, flexShrink: 0, background: bg2, border, borderRadius: 14, padding: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '8px 10px 4px', marginBottom: 4 }}>
          Content Tools
        </div>
        {TOOLS.map((tool) => {
          const isActive = tool.id === activeTool
          return (
            <div
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 2, cursor: 'pointer',
                background: isActive ? 'rgba(245,158,11,0.08)' : 'transparent',
                border: isActive ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
                borderLeft: isActive ? '3px solid var(--amber)' : '3px solid transparent',
              }}
            >
              <span style={{ fontSize: 18 }}>{tool.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--amber)' : 'var(--text)', lineHeight: 1.2 }}>{tool.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text4)' }}>{tool.description}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Form */}
        <div style={{ background: bg2, border, borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {fields.map((field) => (
              <div key={field.key} style={{ gridColumn: field.type === 'textarea' ? '1 / -1' : 'auto' }}>
                <label style={labelStyle} htmlFor={`field-${field.key}`}>{field.label}</label>
                {field.type === 'select' ? (
                  <select id={`field-${field.key}`} value={inputs[field.key] ?? ''} onChange={(e) => setInputs((p) => ({ ...p, [field.key]: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="" disabled>Select…</option>
                    {field.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea id={`field-${field.key}`} value={inputs[field.key] ?? ''} onChange={(e) => setInputs((p) => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                ) : (
                  <input id={`field-${field.key}`} type="text" value={inputs[field.key] ?? ''} onChange={(e) => setInputs((p) => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} style={inputStyle} />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !canGenerate}
            aria-label="Generate 3 Variations"
            style={{
              marginTop: 18, width: '100%', background: 'var(--amber)', color: '#050810', border: 'none',
              borderRadius: 10, padding: '13px 20px', fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-display)',
              cursor: loading || !canGenerate ? 'not-allowed' : 'pointer', opacity: loading || !canGenerate ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? 'Generating…' : '✨ Generate 3 Variations'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '13px 18px', marginBottom: 16, fontSize: 14, color: 'var(--red)', display: 'flex', gap: 10 }}>
            <span>⚠️</span>
            <div><strong>Generation failed</strong> — {error} <button onClick={handleGenerate} style={{ marginLeft: 8, color: 'var(--amber)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Try Again</button></div>
          </div>
        )}

        {/* Variation cards */}
        {variations.map((_, idx) => {
          const variation = editedVariations[idx] ?? variations[idx]
          const isSelected = selectedIdx === idx
          return (
            <div
              key={idx}
              style={{
                background: bg2,
                border: isSelected ? '2px solid var(--amber)' : border,
                borderRadius: 14, marginBottom: 12, overflow: 'hidden',
              }}
            >
              {/* Card header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: isSelected ? 'default' : 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: isSelected ? 'var(--amber)' : 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Variation {idx + 1}
                  </span>
                  {isSelected && (
                    <span style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: 'var(--amber)', fontWeight: 700 }}>
                      ✓ Using this
                    </span>
                  )}
                </div>
                {!isSelected && (
                  <button
                    onClick={() => setSelectedIdx(idx)}
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, color: 'var(--text)', cursor: 'pointer' }}
                  >
                    Use this
                  </button>
                )}
              </div>

              {/* Collapsed preview */}
              {!isSelected && (
                <div style={{ padding: '0 18px 14px', fontSize: 13, color: 'var(--text4)' }}>
                  {getVariationPreview(variation)}…
                </div>
              )}

              {/* Expanded sections */}
              {isSelected && (
                <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {sections.map((section) => {
                    const value = getFieldValue(variation, section.key)
                    const limit = getSectionLimit(section)
                    const isEditing = editingField?.varIdx === idx && editingField?.key === section.key
                    const charLen = value.length

                    return (
                      <div key={section.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{section.label}</span>
                          {limit && (
                            <span style={{ fontSize: 11, fontWeight: 800, color: getCharBadgeColor(charLen, limit) }}>
                              {charLen} / {limit}
                            </span>
                          )}
                        </div>
                        {isEditing ? (
                          <textarea
                            autoFocus
                            value={value}
                            onChange={(e) => handleFieldEdit(idx, section.key, e.target.value)}
                            onBlur={() => setEditingField(null)}
                            rows={3}
                            style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--amber)', borderRadius: 8, color: 'var(--text)', fontSize: 13, padding: '9px 12px', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', outline: 'none' }}
                          />
                        ) : (
                          <div
                            onClick={() => setEditingField({ varIdx: idx, key: section.key })}
                            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text)', cursor: 'text', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, lineHeight: 1.5 }}
                          >
                            <span>{value || <em style={{ color: 'var(--text4)' }}>empty</em>}</span>
                            <span style={{ color: 'var(--text4)', flexShrink: 0, marginTop: 1 }}>✏️</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Next button */}
        {variations.length > 0 && (
          <button
            onClick={handleNext}
            disabled={selectedIdx === null}
            aria-label="Next"
            style={{
              width: '100%', background: selectedIdx !== null ? 'var(--amber)' : 'var(--bg3)',
              color: selectedIdx !== null ? '#050810' : 'var(--text4)', border: selectedIdx !== null ? 'none' : border,
              borderRadius: 10, padding: '14px 20px', fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-display)',
              cursor: selectedIdx !== null ? 'pointer' : 'not-allowed', opacity: selectedIdx !== null ? 1 : 0.5,
            }}
          >
            Next: Generate Image →
          </button>
        )}
      </div>
    </div>
  )
}
