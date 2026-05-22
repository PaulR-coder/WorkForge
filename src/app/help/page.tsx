import { HELP_CATEGORIES, ALL_ARTICLES } from '@/lib/help-articles'
import { HelpClient } from './HelpClient'

export const metadata = {
  title: 'Help Center — WorkForge',
  description: 'Search guides, tutorials, and ask our AI anything about WorkForge.',
}

export default function HelpPage() {
  const popularArticles = ALL_ARTICLES.filter(a => a.popular)
  return (
    <HelpClient
      categories={HELP_CATEGORIES}
      popularArticles={popularArticles}
      allArticles={ALL_ARTICLES}
    />
  )
}
