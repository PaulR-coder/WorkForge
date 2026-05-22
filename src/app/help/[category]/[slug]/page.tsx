import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getArticleBySlug, getCategoryBySlug, HELP_CATEGORIES } from '@/lib/help-articles'
import type { HelpArticle } from '@/lib/help-articles'
import type { Metadata } from 'next'

// ─── Params ──────────────────────────────────────────────────────────────────

type PageParams = { category: string; slug: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { category, slug } = await params
  const article = getArticleBySlug(category, slug)
  if (!article) return { title: 'Not Found — WorkForge Help' }
  return {
    title: `${article.title} — WorkForge Help`,
    description: article.description,
  }
}

export async function generateStaticParams() {
  return HELP_CATEGORIES.flatMap(cat =>
    cat.articles.map(article => ({
      category: cat.slug,
      slug: article.slug,
    }))
  )
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderContent(content: string): React.ReactNode[] {
  const lines = content.split('\n')
  const nodes: React.ReactNode[] = []
  let listItems: string[] = []
  let key = 0

  const flushList = () => {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={key++} style={{ margin: '0 0 18px 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {listItems.map((item, i) => (
            <li key={i} style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7 }}>
              <span dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
            </li>
          ))}
        </ul>
      )
      listItems = []
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (line.startsWith('## ')) {
      flushList()
      const heading = line.slice(3)
      const id = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      nodes.push(
        <h2
          key={key++}
          id={id}
          style={{
            fontSize: 20,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: 12,
            marginTop: 36,
            paddingLeft: 14,
            borderLeft: '3px solid var(--amber)',
            letterSpacing: '-0.2px',
            scrollMarginTop: 80,
          }}
        >
          {heading}
        </h2>
      )
      continue
    }

    if (line.startsWith('- ')) {
      listItems.push(line.slice(2))
      continue
    }

    flushList()

    if (line.startsWith('| ')) {
      // Simple table row — wrap in mono pre
      nodes.push(
        <div
          key={key++}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--text3)',
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 14px',
            marginBottom: 4,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          {line}
        </div>
      )
      continue
    }

    if (line === '' || line === '---') {
      nodes.push(<div key={key++} style={{ height: 8 }} />)
      continue
    }

    nodes.push(
      <p key={key++} style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 16 }}>
        <span dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
      </p>
    )
  }

  flushList()
  return nodes
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text);font-weight:700">$1</strong>')
    .replace(/`(.+?)`/g, '<code style="font-family:var(--font-mono);font-size:12px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:1px 6px;color:var(--amber)">$1</code>')
    .replace(
      /https?:\/\/[^\s)]+/g,
      url => `<a href="${url}" style="color:var(--amber);text-decoration:underline">${url}</a>`
    )
}

// ─── Extract headings from content ───────────────────────────────────────────

function extractHeadings(content: string): { id: string; text: string }[] {
  return content
    .split('\n')
    .filter(line => line.startsWith('## '))
    .map(line => {
      const text = line.slice(3).trim()
      return { id: text.toLowerCase().replace(/[^a-z0-9]+/g, '-'), text }
    })
}

// ─── Was this helpful ─────────────────────────────────────────────────────────

function WasHelpful() {
  return (
    <div style={{
      marginTop: 48,
      padding: '24px 28px',
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
        Was this article helpful?
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {['Yes, it helped', 'Not really'].map(label => (
          <button
            key={label}
            className="wf-helpful-btn"
            style={{
              padding: '8px 20px',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text3)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 150ms, border-color 150ms, color 150ms',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ArticlePage({ params }: { params: Promise<PageParams> }) {
  const { category: categorySlug, slug } = await params
  const article = getArticleBySlug(categorySlug, slug)
  if (!article) notFound()

  const category = getCategoryBySlug(categorySlug)
  if (!category) notFound()

  const headings = extractHeadings(article.content)
  const relatedArticles = category.articles
    .filter(a => a.slug !== slug)
    .slice(0, 3)

  const encodedTitle = encodeURIComponent(article.title)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
      <style>{`
        .wf-helpful-btn:hover { background: var(--amber) !important; color: #060a17 !important; border-color: var(--amber) !important; }
        .wf-related-link:hover { border-color: rgba(245,158,11,.5) !important; background: var(--bg3) !important; }
        .wf-toc-link:hover { color: var(--amber) !important; background: rgba(245,158,11,.08) !important; }
        @media (max-width: 768px) { .hide-mobile { display: none !important; } }
      `}</style>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 40,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--amber)">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>WorkForge</span>
        </Link>
        <Link href="/help" style={{ fontSize: 13, color: 'var(--text3)', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Help Center
        </Link>
      </div>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 32px 80px', display: 'flex', gap: 40, alignItems: 'flex-start' }}>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Breadcrumbs */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28, fontSize: 12, color: 'var(--text4)' }}>
            <Link href="/help" style={{ color: 'var(--text4)', textDecoration: 'none', fontWeight: 500 }}>Help Center</Link>
            <span>›</span>
            <Link href={`/help#${category.slug}`} style={{ color: 'var(--text4)', textDecoration: 'none', fontWeight: 500 }}>{category.title}</Link>
            <span>›</span>
            <span style={{ color: 'var(--text3)' }}>{article.title}</span>
          </nav>

          {/* Article header */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 20 }}>{category.icon}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: 'var(--amber)',
                background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)',
                borderRadius: 20, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.4px',
              }}>
                {category.title}
              </span>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: 'var(--text4)', fontWeight: 500,
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                {article.readTime} min read
              </span>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800,
              color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1.15, marginBottom: 12,
            }}>
              {article.title}
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text3)', lineHeight: 1.6, fontWeight: 400 }}>
              {article.description}
            </p>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 36 }} />

          {/* Article body */}
          <article>
            {renderContent(article.content)}
          </article>

          {/* Was this helpful */}
          <WasHelpful />

          {/* Related articles */}
          {relatedArticles.length > 0 && (
            <div style={{ marginTop: 48 }}>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
                color: 'var(--text)', marginBottom: 16, letterSpacing: '-0.2px',
              }}>
                Related Articles
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {relatedArticles.map(related => (
                  <Link
                    key={related.slug}
                    href={`/help/${categorySlug}/${related.slug}`}
                    className="wf-related-link"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 16, padding: '14px 16px', background: 'var(--bg2)',
                      border: '1px solid var(--border)', borderRadius: 10, textDecoration: 'none',
                      transition: 'border-color 150ms, background 150ms',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{related.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text4)' }}>{related.description}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back + Ask AI */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 48, flexWrap: 'wrap', gap: 12 }}>
            <Link
              href="/help"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                fontSize: 13, fontWeight: 600, color: 'var(--text3)',
                textDecoration: 'none', padding: '8px 14px',
                border: '1px solid var(--border)', borderRadius: 8,
                background: 'var(--bg2)',
              }}
            >
              ← Back to Help Center
            </Link>
            <Link
              href={`/help?q=${encodedTitle}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                fontSize: 13, fontWeight: 700, color: '#060a17',
                textDecoration: 'none', padding: '8px 16px',
                background: 'var(--amber)', borderRadius: 8,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              Ask AI about this topic
            </Link>
          </div>
        </main>

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        {headings.length > 0 && (
          <aside style={{
            width: 240, flexShrink: 0,
            position: 'sticky', top: 80, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
          }}
            className="hide-mobile"
          >
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px 18px',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 800, color: 'var(--text4)',
                textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12,
              }}>
                In this article
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {headings.map(h => (
                  <a
                    key={h.id}
                    href={`#${h.id}`}
                    className="wf-toc-link"
                    style={{
                      fontSize: 12, fontWeight: 500, color: 'var(--text3)',
                      textDecoration: 'none', padding: '5px 8px', borderRadius: 6,
                      lineHeight: 1.4, transition: 'color 120ms, background 120ms',
                      display: 'block',
                    }}
                  >
                    {h.text}
                  </a>
                ))}
              </nav>
            </div>

            {/* Quick contact */}
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px 18px', marginTop: 14,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Still stuck?
              </div>
              <p style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 10, lineHeight: 1.5 }}>
                Our team responds within 1 business day.
              </p>
              <a
                href="mailto:support@getworkforge.com"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 700, color: 'var(--amber)',
                  textDecoration: 'none',
                }}
              >
                Email Support →
              </a>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
