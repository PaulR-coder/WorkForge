import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/help', '/terms', '/privacy', '/accessibility'],
        disallow: ['/'],
      },
    ],
    sitemap: 'https://getworkforge.com/sitemap.xml',
  }
}
