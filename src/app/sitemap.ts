import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://getworkforge.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: 'https://getworkforge.com/pricing',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://getworkforge.com/help',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: 'https://getworkforge.com/terms',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://getworkforge.com/privacy',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
