'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { HelpCategory, HelpArticle } from '@/lib/help-articles'

// ─── Icons ────────────────────────────────────────────────────────────────────

function BoltIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function ArrowRightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  categories: HelpCategory[]
  popularArticles: HelpArticle[]
  allArticles: HelpArticle[]
}

// ─── Highlight matching text ──────────────────────────────────────────────────

function highlight(text: string, query: string): string {
  if (!query) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark style="background:rgba(245,158,11,.25);color:var(--amber);border-radius:2px;padding:0 2px">$1</mark>')
}

// ─── Category card ───────────────────────────────────────────────────────────

function CategoryCard({ category }: { category: HelpCategory }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={`/help#${category.slug}`}
      style={{
        display: 'block',
        background: 'var(--bg2)',
        border: `1px solid ${hovered ? 'var(--amber)' : 'var(--border)'}`,
        borderRadius: 14,
        padding: '24px 22px',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease',
        boxShadow: hovered ? '0 0 0 1px rgba(245,158,11,.15), var(--shadow-card)' : 'var(--shadow-card)',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ fontSize: 36, marginBottom: 12, lineHeight: 1 }}>{category.icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{category.title}</div>
      <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.5, marginBottom: 14 }}>{category.description}</div>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--amber)',
        background: 'rgba(245,158,11,.1)',
        border: '1px solid rgba(245,158,11,.2)',
        borderRadius: 20,
        padding: '3px 10px',
      }}>
        {category.articles.length} articles
      </div>
    </Link>
  )
}

// ─── Popular article card ─────────────────────────────────────────────────────

function PopularCard({ article, categoryTitle }: { article: HelpArticle; categoryTitle: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={`/help/${article.category}/${article.slug}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        border: `1px solid ${hovered ? 'var(--amber-border)' : 'var(--border)'}`,
        borderRadius: 12,
        padding: '16px 18px',
        textDecoration: 'none',
        transition: 'border-color 150ms ease, background 150ms ease',
        background: hovered ? 'var(--bg3)' : 'var(--bg2)',
      } as React.CSSProperties}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {article.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'var(--amber)',
            background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.18)',
            borderRadius: 20, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.4px',
          }}>{categoryTitle}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text4)' }}>
            <ClockIcon />{article.readTime} min read
          </span>
        </div>
      </div>
      <div style={{ color: hovered ? 'var(--amber)' : 'var(--text4)', flexShrink: 0, transition: 'color 150ms ease' }}>
        <ArrowRightIcon />
      </div>
    </Link>
  )
}

// ─── Section article row ──────────────────────────────────────────────────────

function ArticleRow({ article }: { article: HelpArticle }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={`/help/${article.category}/${article.slug}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 10,
        textDecoration: 'none',
        background: hovered ? 'var(--bg3)' : 'transparent',
        transition: 'background 120ms ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ color: 'var(--text4)', marginTop: 3, flexShrink: 0 }}>
        <ArrowRightIcon size={12} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{article.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.5 }}>{article.description}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text4)', flexShrink: 0 }}>
        <ClockIcon />{article.readTime}m
      </div>
    </Link>
  )
}

// ─── Search result item ───────────────────────────────────────────────────────

function SearchResultItem({
  article,
  query,
  categoryTitle,
  onSelect,
}: {
  article: HelpArticle
  query: string
  categoryTitle: string
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={`/help/${article.category}/${article.slug}`}
      onClick={onSelect}
      style={{
        display: 'block',
        padding: '12px 16px',
        textDecoration: 'none',
        background: hovered ? 'var(--bg3)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        transition: 'background 100ms ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}
        dangerouslySetInnerHTML={{ __html: highlight(article.title, query) }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--amber)',
          background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.18)',
          borderRadius: 20, padding: '2px 8px',
        }}>{categoryTitle}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text4)' }}>
          <ClockIcon />{article.readTime} min read
        </span>
      </div>
      <div
        style={{ fontSize: 12, color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        dangerouslySetInnerHTML={{ __html: highlight(article.description, query) }}
      />
    </Link>
  )
}

// ─── Quick pill ───────────────────────────────────────────────────────────────

function QuickPill({ article }: { article: HelpArticle }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={`/help/${article.category}/${article.slug}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 12,
        fontWeight: 600,
        color: hovered ? 'var(--amber)' : 'var(--text3)',
        background: hovered ? 'rgba(245,158,11,.1)' : 'var(--bg3)',
        border: `1px solid ${hovered ? 'rgba(245,158,11,.3)' : 'var(--border)'}`,
        borderRadius: 20,
        padding: '5px 13px',
        textDecoration: 'none',
        transition: 'all 150ms ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {article.title}
    </Link>
  )
}

// ─── Main HelpClient ──────────────────────────────────────────────────────────

export function HelpClient({ categories, popularArticles, allArticles }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiAsked, setAiAsked] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const getCategoryTitle = useCallback(
    (slug: string) => categories.find(c => c.slug === slug)?.title ?? slug,
    [categories]
  )

  const handleSearch = (value: string) => {
    setQuery(value)
    setAiAnswer('')
    setAiError('')
    setAiAsked(false)

    if (value.trim().length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    const q = value.toLowerCase().trim()
    const results = allArticles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q)
    ).slice(0, 6)

    setSearchResults(results)
    setShowDropdown(true)
  }

  const clearSearch = () => {
    setQuery('')
    setSearchResults([])
    setShowDropdown(false)
    setAiAnswer('')
    setAiError('')
    setAiAsked(false)
    searchRef.current?.focus()
  }

  const handleAskAI = async () => {
    if (!query || query.trim().length < 5) return
    setAiLoading(true)
    setAiAnswer('')
    setAiError('')
    setAiAsked(true)
    setShowDropdown(false)

    try {
      const res = await fetch('/api/help/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        setAiError((data as { error?: string }).error ?? 'Something went wrong. Please try again.')
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
            if (event.error) { setAiError(event.error); return }
            if (event.text) setAiAnswer(prev => prev + event.text)
          } catch { /* malformed chunk, skip */ }
        }
      }
    } catch {
      setAiError('Could not connect. Please check your connection and try again.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchResults.length > 0) {
        router.push(`/help/${searchResults[0].category}/${searchResults[0].slug}`)
        setShowDropdown(false)
      } else if (query.trim().length >= 5) {
        handleAskAI()
      }
    }
    if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const isLongQuery = query.trim().length >= 10
  const noResults = isLongQuery && searchResults.length === 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
      {/* ── Topbar ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <BoltIcon size={20} color="var(--amber)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>WorkForge</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/login" style={{ fontSize: 13, color: 'var(--text3)', textDecoration: 'none', fontWeight: 500 }}>Sign In</Link>
          <Link href="/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--amber)', color: '#060a17', fontSize: 13, fontWeight: 700,
            padding: '7px 15px', borderRadius: 8, textDecoration: 'none',
          }}>Get Started</Link>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        background: 'radial-gradient(ellipse at 40% 50%, rgba(245,158,11,.12) 0%, transparent 60%)',
        padding: '80px 32px 60px',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 200, background: 'radial-gradient(ellipse, rgba(245,158,11,.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 72, height: 72, background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.25)',
          borderRadius: 18, marginBottom: 24,
        }}>
          <BoltIcon size={36} color="var(--amber)" />
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 800,
          color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 12, lineHeight: 1.1,
        }}>
          How can we help?
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text3)', marginBottom: 36, fontWeight: 400 }}>
          Search guides, or ask our AI anything about WorkForge
        </p>

        {/* Search bar */}
        <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto' }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, height: 52, padding: '0 16px',
            boxShadow: 'var(--shadow-xl)',
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
          }}>
            <span style={{ color: 'var(--text4)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <SearchIcon />
            </span>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => query.length >= 2 && setShowDropdown(true)}
              placeholder="Search articles or ask a question..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 15, padding: '0 12px',
                fontFamily: 'var(--font-body)',
              }}
            />
            {query && (
              <button
                onClick={clearSearch}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text4)', display: 'flex', alignItems: 'center', padding: 4,
                }}
              >
                <XIcon />
              </button>
            )}
          </div>

          {/* Search dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div
              ref={dropdownRef}
              style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 12, marginTop: 4, boxShadow: 'var(--shadow-xl)',
                overflow: 'hidden', animation: 'fadeIn 120ms ease',
              }}
            >
              {searchResults.map(a => (
                <SearchResultItem
                  key={`${a.category}-${a.slug}`}
                  article={a}
                  query={query}
                  categoryTitle={getCategoryTitle(a.category)}
                  onSelect={() => setShowDropdown(false)}
                />
              ))}
              <div style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--border)',
                fontSize: 12, color: 'var(--text4)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</span>
                <span style={{ color: 'var(--text4)' }}>Press Enter to open first result</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick pills */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, marginTop: 20, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text4)', fontWeight: 600 }}>Popular:</span>
          {popularArticles.slice(0, 4).map(a => (
            <QuickPill key={`${a.category}-${a.slug}`} article={a} />
          ))}
        </div>
      </div>

      {/* ── AI Section ───────────────────────────────────────────────────── */}
      {(isLongQuery || aiAsked) && (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 32px' }}>
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '20px 22px', marginTop: -20, position: 'relative', zIndex: 10,
            boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.25)',
                  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <BoltIcon size={14} color="var(--amber)" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Ask AI</span>
                <span style={{ fontSize: 11, color: 'var(--text4)' }}>Powered by Claude</span>
              </div>
              {!aiAsked && (
                <button
                  onClick={handleAskAI}
                  disabled={query.trim().length < 5}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'var(--amber)', color: '#060a17', fontSize: 13, fontWeight: 700,
                    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    opacity: query.trim().length < 5 ? 0.5 : 1,
                    transition: 'opacity 150ms ease, background 150ms ease',
                  }}
                >
                  <BoltIcon size={13} color="#060a17" />
                  Ask AI
                </button>
              )}
            </div>

            {!aiAsked && noResults && (
              <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>
                No articles found for &ldquo;{query}&rdquo;. Click <strong style={{ color: 'var(--amber)' }}>Ask AI</strong> to get an instant answer.
              </p>
            )}

            {aiLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text3)', fontSize: 13 }}>
                <SpinnerIcon />
                Thinking...
              </div>
            )}

            {aiAnswer && (
              <div style={{
                fontSize: 14, color: 'var(--text)', lineHeight: 1.7,
                background: 'rgba(245,158,11,.05)', border: '1px solid rgba(245,158,11,.15)',
                borderRadius: 10, padding: '14px 16px',
              }}>
                {aiAnswer}
              </div>
            )}

            {aiError && (
              <div style={{
                fontSize: 13, color: 'var(--red)', background: 'rgba(239,68,68,.08)',
                border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '12px 14px',
              }}>
                {aiError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '56px 32px 80px' }}>

        {/* Category grid */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
            color: 'var(--text)', marginBottom: 20, letterSpacing: '-0.3px',
          }}>
            Browse by Category
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {categories.map(cat => (
              <CategoryCard key={cat.slug} category={cat} />
            ))}
          </div>
        </section>

        {/* Popular articles */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
            color: 'var(--text)', marginBottom: 20, letterSpacing: '-0.3px',
          }}>
            Popular Articles
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {popularArticles.map(a => (
              <PopularCard
                key={`${a.category}-${a.slug}`}
                article={a}
                categoryTitle={getCategoryTitle(a.category)}
              />
            ))}
          </div>
        </section>

        {/* All categories inline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          {categories.map(cat => (
            <section key={cat.slug} id={cat.slug}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 4, paddingBottom: 14, borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{cat.icon}</span>
                  <h3 style={{
                    fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700,
                    color: 'var(--text)', letterSpacing: '-0.3px',
                  }}>{cat.title}</h3>
                </div>
                <Link
                  href={`/help/${cat.slug}/${cat.articles[0]?.slug ?? ''}`}
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  View all <ArrowRightIcon size={12} />
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
                {cat.articles.slice(0, 3).map(article => (
                  <ArticleRow key={article.slug} article={article} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Referral program — moved from nav */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
          padding: '20px 24px', marginTop: 24,
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>🎁 Referral Program</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, lineHeight: 1.6 }}>
            Refer other businesses to WorkForge and earn rewards. Share your unique referral link with other service companies.
          </div>
          <a href="/referral" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text2)',
          }}>
            View my referral link →
          </a>
        </div>

        {/* Footer CTA */}
        <div style={{
          marginTop: 80, padding: '36px 40px',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 18, textAlign: 'center',
        }}>
          <div style={{
            fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 700,
            color: 'var(--text)', marginBottom: 10,
          }}>Still need help?</div>
          <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24, maxWidth: 440, margin: '0 auto 24px' }}>
            Our team is here to help. Reach out by email or submit a feature request directly in the app.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <a
              href="mailto:support@getworkforge.com"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'var(--amber)', color: '#060a17', fontSize: 13, fontWeight: 700,
                padding: '10px 20px', borderRadius: 9, textDecoration: 'none',
              }}
            >
              Email Support
            </a>
            <Link
              href="/feedback"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'var(--bg3)', color: 'var(--text2)', fontSize: 13, fontWeight: 600,
                padding: '10px 20px', borderRadius: 9, textDecoration: 'none',
                border: '1px solid var(--border)',
              }}
            >
              Submit a Feature Request
            </Link>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text4)', marginTop: 16 }}>
            support@getworkforge.com · We typically respond within 1 business day
          </p>
        </div>
      </div>
    </div>
  )
}
