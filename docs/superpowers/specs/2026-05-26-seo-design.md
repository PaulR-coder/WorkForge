# SEO Optimization Design

## Goal
Make getworkforge.com discoverable on Google for field service management keywords — both broad terms (field service software, work order app) and trade-specific terms (HVAC dispatch, plumbing business software, electrical contractor software) with local targeting for Tampa, FL.

## What Changes

### 1. Root Layout — Open Graph + Twitter Card tags
File: `src/app/layout.tsx`

Add to the existing `metadata` export:
- `openGraph`: title, description, url (`https://getworkforge.com`), siteName, type (`website`), locale (`en_US`)
- `twitter`: card (`summary_large_image`), title, description

No title or description change at root level — those are overridden per-page.

### 2. Landing Page — Dedicated metadata + JSON-LD schema
File: `src/app/page.tsx`

Add a `metadata` export (currently missing):
```
title: "WorkForge — Field Service Management Software for Tampa & Beyond"
description: "WorkForge is the all-in-one field service management platform for HVAC, plumbing, and electrical contractors. Dispatch faster, invoice in 60 seconds, manage your whole crew. Built for Tampa and growing."
keywords: [
  "field service management software",
  "work order management app",
  "job dispatch software",
  "technician scheduling software",
  "HVAC dispatch software",
  "plumbing business management",
  "electrical contractor software",
  "service business software",
  "field service software Tampa",
  "Tampa HVAC software",
  "Tampa service business management"
]
openGraph: (same title/description as above, type: "website")
```

Add a `<script type="application/ld+json">` block inside the page JSX with two schema types:

**Organization schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "WorkForge",
  "url": "https://getworkforge.com",
  "description": "Field service management platform for HVAC, plumbing, and electrical contractors.",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Tampa",
    "addressRegion": "FL",
    "addressCountry": "US"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "support@getworkforge.com",
    "contactType": "customer support"
  }
}
```

**SoftwareApplication schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "WorkForge",
  "url": "https://getworkforge.com",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "All-in-one field service management for HVAC, plumbing, and electrical contractors. Work orders, dispatch, invoicing, and team management.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "14-day free trial"
  },
  "audience": {
    "@type": "Audience",
    "audienceType": "HVAC contractors, plumbers, electricians, field service businesses"
  }
}
```

Both schema objects are combined in a single `<script>` tag as a JSON-LD array.

### 3. Pricing Page — Metadata
File: `src/app/pricing/page.tsx`

Add a `metadata` export:
```
title: "Pricing — WorkForge Field Service Software"
description: "Simple, transparent pricing for field service teams. Start with a 14-day free trial. No credit card required."
```

### 4. robots.ts — Crawl guidance
File: `src/app/robots.ts` (new)

```typescript
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/help', '/terms', '/privacy'],
        disallow: ['/'],
      },
    ],
    sitemap: 'https://getworkforge.com/sitemap.xml',
  }
}
```

The `allow` rules for specific public pages take precedence over the catch-all `disallow: ['/']`, so crawlers only index the five public pages. API routes, auth pages, and the logged-in app are all blocked.

### 5. sitemap.ts — Page index
File: `src/app/sitemap.ts` (new)

```typescript
export default function sitemap() {
  return [
    { url: 'https://getworkforge.com',         lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: 'https://getworkforge.com/pricing', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://getworkforge.com/help',    lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
    { url: 'https://getworkforge.com/terms',   lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: 'https://getworkforge.com/privacy', lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ]
}
```

## What Does NOT Change
- Landing page copy/content — keyword optimization is done through metadata only
- Any app routes (`/dashboard`, `/jobs`, etc.) — these are behind auth and should not be indexed
- Database, API, or any backend code
- Auth pages (login, register) — no SEO value

## Implementation Boundary
All changes are metadata and static files only. No runtime behavior changes. No API calls needed.
