'use client'

import { useState, useEffect } from 'react'
import { trackEvent } from '@/lib/posthog'

// ── Types ─────────────────────────────────────────────────────────────────────

type ToolId =
  | 'google_ad'
  | 'facebook_ad'
  | 'email_campaign'
  | 'service_description'
  | 'social_post'
  | 'review_response'

interface Tool {
  id: ToolId
  icon: string
  name: string
  description: string
}

interface FieldDef {
  key: string
  label: string
  placeholder: string
  type: 'text' | 'select'
  options?: string[]
  hint?: string
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  {
    id: 'google_ad',
    icon: '📢',
    name: 'Google Ads',
    description: 'Search ad headlines & descriptions',
  },
  {
    id: 'social_post',
    icon: '📱',
    name: 'Social Media',
    description: 'Platform-specific post variations',
  },
  {
    id: 'email_campaign',
    icon: '📧',
    name: 'Email Campaign',
    description: 'Subject lines & email body copy',
  },
  {
    id: 'service_description',
    icon: '🏢',
    name: 'Service Page',
    description: 'SEO-optimized service descriptions',
  },
  {
    id: 'review_response',
    icon: '👍',
    name: 'Review Response',
    description: 'Professional replies to customer reviews',
  },
  {
    id: 'facebook_ad',
    icon: '📣',
    name: 'Facebook/Instagram',
    description: 'Paid social ad copy',
  },
]

const TOOL_FIELDS: Record<ToolId, FieldDef[]> = {
  google_ad: [
    { key: 'businessName', label: 'Business Name', placeholder: 'Acme HVAC & Plumbing', type: 'text' },
    { key: 'service', label: 'Service', placeholder: 'AC repair, water heater installation…', type: 'text' },
    { key: 'location', label: 'Service Area', placeholder: 'Austin, TX', type: 'text' },
    { key: 'callToAction', label: 'Call to Action', placeholder: 'Call today, Get a free quote…', type: 'text' },
  ],
  facebook_ad: [
    { key: 'businessName', label: 'Business Name', placeholder: 'Acme HVAC & Plumbing', type: 'text' },
    { key: 'service', label: 'Service', placeholder: 'HVAC tune-up, drain cleaning…', type: 'text' },
    { key: 'targetAudience', label: 'Target Audience', placeholder: 'Homeowners 35-65, renters, property managers…', type: 'text' },
    { key: 'offer', label: 'Offer / Promotion', placeholder: '$50 off first service, free estimate…', type: 'text' },
  ],
  email_campaign: [
    { key: 'businessName', label: 'Business Name', placeholder: 'Acme HVAC & Plumbing', type: 'text' },
    {
      key: 'campaignType',
      label: 'Campaign Type',
      placeholder: '',
      type: 'select',
      options: [
        'Seasonal tune-up reminder',
        'New customer welcome',
        'Service promotion',
        'Maintenance plan upsell',
        'Re-engagement (lapsed customers)',
        'Holiday offer',
        'Emergency service announcement',
        'Referral program',
      ],
    },
    { key: 'offer', label: 'Offer / Key Message', placeholder: '20% off furnace tune-up this month…', type: 'text' },
    {
      key: 'tone',
      label: 'Tone',
      placeholder: '',
      type: 'select',
      options: ['Professional', 'Friendly & Casual', 'Urgent', 'Educational', 'Warm & Personal'],
    },
  ],
  service_description: [
    { key: 'businessName', label: 'Business Name', placeholder: 'Acme HVAC & Plumbing', type: 'text' },
    { key: 'service', label: 'Service', placeholder: 'Residential AC installation, tankless water heaters…', type: 'text' },
    {
      key: 'differentiators',
      label: 'What Makes You Different',
      placeholder: '24/7 availability, NATE-certified techs, 1-year labor warranty, flat-rate pricing…',
      type: 'text',
      hint: 'List your key differentiators separated by commas',
    },
  ],
  social_post: [
    { key: 'businessName', label: 'Business Name', placeholder: 'Acme HVAC & Plumbing', type: 'text' },
    {
      key: 'platform',
      label: 'Platform',
      placeholder: '',
      type: 'select',
      options: ['Facebook', 'Instagram', 'LinkedIn', 'Twitter/X'],
    },
    { key: 'topic', label: 'Topic / Theme', placeholder: 'Summer AC maintenance tips, why your pipes freeze…', type: 'text' },
    {
      key: 'tone',
      label: 'Tone',
      placeholder: '',
      type: 'select',
      options: ['Educational', 'Promotional', 'Behind-the-Scenes', 'Seasonal', 'Community-focused'],
    },
  ],
  review_response: [
    { key: 'businessName', label: 'Business Name', placeholder: 'Acme HVAC & Plumbing', type: 'text' },
    {
      key: 'rating',
      label: 'Star Rating',
      placeholder: '',
      type: 'select',
      options: ['5 — Excellent', '4 — Good', '3 — Average', '2 — Poor', '1 — Terrible'],
    },
    {
      key: 'review',
      label: 'Customer Review Text',
      placeholder: 'Paste the customer\'s review here…',
      type: 'text',
      hint: 'Copy & paste the full review text',
    },
  ],
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  company: string
  name: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MarketingClient({ company }: Props) {
  const [activeTool, setActiveTool] = useState<ToolId>('google_ad')
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [output, setOutput] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Pre-fill business name from session company
  useEffect(() => {
    if (company) {
      setInputs((prev) => ({ ...prev, businessName: company }))
    }
  }, [company])

  // When tool changes, preserve businessName but clear other fields
  function handleToolChange(toolId: ToolId) {
    setActiveTool(toolId)
    setOutput('')
    setError('')
    setInputs((prev) => ({ businessName: prev.businessName ?? company ?? '' }))
  }

  function handleInputChange(key: string, value: string) {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }

  async function handleGenerate() {
    setError('')
    setOutput('')
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

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Generation failed. Please try again.')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const event = JSON.parse(part.slice(6)) as { text?: string; done?: boolean; error?: string }
            if (event.error) { setError(event.error); return }
            if (event.text) setOutput(prev => prev + event.text)
          } catch { /* malformed chunk, skip */ }
        }
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select text
    }
  }

  const fields = TOOL_FIELDS[activeTool]
  const activeTool_ = TOOLS.find((t) => t.id === activeTool)!

  // Check if all required fields are filled
  const canGenerate = fields.every((f) => (inputs[f.key] ?? '').trim().length > 0)

  // ── Styles ──────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text)',
    fontSize: 14,
    padding: '12px 14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.15s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text4)',
    textTransform: 'uppercase',
    letterSpacing: '0.7px',
    marginBottom: 6,
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .mkt-tool-card:hover {
          background: var(--bg3) !important;
          border-color: var(--border) !important;
          cursor: pointer;
        }
        .mkt-input:focus {
          border-color: var(--amber) !important;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.13);
        }
        .mkt-generate-btn:hover:not(:disabled) {
          filter: brightness(1.08);
        }
        .mkt-generate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .mkt-action-btn:hover {
          background: var(--bg3) !important;
        }
        .mkt-output-area {
          animation: fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      <div style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11,
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              ✨
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 900,
              color: 'var(--text)',
              letterSpacing: '-0.4px',
              margin: 0,
            }}>
              AI Marketing Suite
            </h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text4)', marginLeft: 52, lineHeight: 1.5 }}>
            Generate professional marketing content for your business — ads, emails, social posts, and more.
          </p>
        </div>

        {/* Two-panel layout */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* Left sidebar — tool selector */}
          <div style={{
            width: 280,
            flexShrink: 0,
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 8,
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 800,
              color: 'var(--text4)',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              padding: '8px 10px 4px',
              marginBottom: 4,
            }}>
              Content Tools
            </div>

            {TOOLS.map((tool) => {
              const isActive = tool.id === activeTool
              return (
                <div
                  key={tool.id}
                  className={isActive ? '' : 'mkt-tool-card'}
                  onClick={() => handleToolChange(tool.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 12px',
                    borderRadius: 10,
                    marginBottom: 2,
                    cursor: 'pointer',
                    background: isActive ? 'rgba(245,158,11,0.08)' : 'transparent',
                    border: isActive ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
                    borderLeft: isActive ? '3px solid var(--amber)' : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{tool.icon}</span>
                  <div>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isActive ? 'var(--amber)' : 'var(--text)',
                      lineHeight: 1.2,
                      marginBottom: 2,
                    }}>
                      {tool.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text4)', lineHeight: 1.3 }}>
                      {tool.description}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Pro tip */}
            <div style={{
              margin: '8px 4px 4px',
              padding: '10px 12px',
              background: 'rgba(245,158,11,0.05)',
              border: '1px solid rgba(245,158,11,0.12)',
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', marginBottom: 3 }}>
                Pro tip
              </div>
              <div style={{ fontSize: 11, color: 'var(--text4)', lineHeight: 1.5 }}>
                The more specific your inputs, the better the output. Include real details about your business.
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Tool header */}
            <div style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '18px 22px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>
                {activeTool_.icon}
              </div>
              <div>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 800,
                  color: 'var(--text)',
                  margin: 0,
                  marginBottom: 3,
                }}>
                  {activeTool_.name}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text4)', margin: 0 }}>
                  {activeTool_.description}
                </p>
              </div>
            </div>

            {/* Input form */}
            <div style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '22px',
              marginBottom: 16,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {fields.map((field) => (
                  <div
                    key={field.key}
                    style={{
                      // Review field spans full width
                      gridColumn: field.key === 'review' ? '1 / -1' : 'auto',
                    }}
                  >
                    <label style={labelStyle}>{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        className="mkt-input"
                        value={inputs[field.key] ?? ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        style={{ ...inputStyle, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23666' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36, cursor: 'pointer' }}
                      >
                        <option value="" disabled>Select an option…</option>
                        {field.options!.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.key === 'review' ? (
                      <textarea
                        className="mkt-input"
                        value={inputs[field.key] ?? ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={4}
                        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                      />
                    ) : (
                      <input
                        className="mkt-input"
                        type="text"
                        value={inputs[field.key] ?? ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        style={inputStyle}
                      />
                    )}
                    {field.hint && (
                      <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 5, lineHeight: 1.4 }}>
                        {field.hint}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                className="mkt-generate-btn"
                onClick={handleGenerate}
                disabled={loading || !canGenerate}
                style={{
                  marginTop: 20,
                  width: '100%',
                  background: 'var(--amber)',
                  color: '#050810',
                  border: 'none',
                  borderRadius: 10,
                  padding: '14px 20px',
                  fontSize: 15,
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.2px',
                  cursor: loading || !canGenerate ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'filter 0.15s',
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: 16, height: 16,
                      border: '2px solid rgba(5,8,16,0.3)',
                      borderTopColor: '#050810',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                    Generating…
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 16 }}>✨</span>
                    Generate Content
                  </>
                )}
              </button>

              {!canGenerate && !loading && (
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text4)', marginTop: 8 }}>
                  Fill in all fields above to generate content
                </p>
              )}
            </div>

            {/* Error state */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 12,
                padding: '14px 18px',
                marginBottom: 16,
                fontSize: 14,
                color: 'var(--red)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>⚠️</span>
                <div>
                  <strong style={{ display: 'block', marginBottom: 2 }}>Generation failed</strong>
                  {error}
                </div>
              </div>
            )}

            {/* Output area */}
            {output && (
              <div className="mkt-output-area" style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '20px 22px',
              }}>
                {/* Output header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}>
                  <div>
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 15,
                      fontWeight: 800,
                      color: 'var(--text)',
                      margin: 0,
                      marginBottom: 4,
                    }}>
                      Generated Content
                    </h3>
                    <div style={{
                      width: 32,
                      height: 3,
                      background: 'var(--amber)',
                      borderRadius: 2,
                    }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="mkt-action-btn"
                      onClick={handleCopy}
                      style={{
                        background: copied ? 'rgba(34,197,94,0.1)' : 'var(--bg3)',
                        border: copied ? '1px solid rgba(34,197,94,0.25)' : '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: copied ? 'var(--green)' : 'var(--text)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s',
                      }}
                    >
                      {copied ? (
                        <>
                          <span>✓</span> Copied!
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                          Copy to Clipboard
                        </>
                      )}
                    </button>
                    <button
                      className="mkt-action-btn"
                      onClick={() => { setOutput(''); setError('') }}
                      style={{
                        background: 'var(--bg3)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text4)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'background 0.15s',
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      Clear
                    </button>
                  </div>
                </div>

                {/* Output content */}
                <pre style={{
                  margin: 0,
                  fontFamily: 'inherit',
                  fontSize: 14,
                  color: 'var(--text)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '16px 18px',
                }}>
                  {output}
                </pre>

                {/* Footer hint */}
                <p style={{
                  fontSize: 11,
                  color: 'var(--text4)',
                  marginTop: 12,
                  marginBottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}>
                  <span style={{ fontSize: 13 }}>💡</span>
                  AI-generated content. Review and customize before publishing.
                </p>
              </div>
            )}

            {/* Empty state — no output yet */}
            {!output && !error && !loading && (
              <div style={{
                background: 'var(--bg2)',
                border: '1px dashed var(--border)',
                borderRadius: 14,
                padding: '40px 24px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{activeTool_.icon}</div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  Ready to generate {activeTool_.name}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text4)', maxWidth: 340, margin: '0 auto', lineHeight: 1.6 }}>
                  Fill in the form above and click Generate Content to create professional marketing copy for your business.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
