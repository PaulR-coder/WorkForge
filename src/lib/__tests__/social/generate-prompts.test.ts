import { buildGeneratePrompt, PUBLISHABLE_TOOLS } from '@/lib/social/generate-prompts'

describe('buildGeneratePrompt', () => {
  it('returns a string containing the JSON schema for google_ad', () => {
    const prompt = buildGeneratePrompt('google_ad', {
      businessName: 'Acme HVAC',
      service: 'AC repair',
      location: 'Tampa, FL',
      callToAction: 'Call Today',
    })
    expect(prompt).toContain('headline1')
    expect(prompt).toContain('headline2')
    expect(prompt).toContain('headline3')
    expect(prompt).toContain('description1')
    expect(prompt).toContain('exactly 3')
  })

  it('returns a string containing the JSON schema for social_post', () => {
    const prompt = buildGeneratePrompt('social_post', {
      businessName: 'Acme HVAC',
      platform: 'Instagram',
      topic: 'AC maintenance tips',
      tone: 'Educational',
    })
    expect(prompt).toContain('caption')
    expect(prompt).toContain('hashtags')
  })

  it('throws for unknown tool', () => {
    expect(() => buildGeneratePrompt('unknown_tool', {})).toThrow()
  })
})

describe('PUBLISHABLE_TOOLS', () => {
  it('includes social_post and facebook_ad', () => {
    expect(PUBLISHABLE_TOOLS).toContain('social_post')
    expect(PUBLISHABLE_TOOLS).toContain('facebook_ad')
  })

  it('excludes google_ad, email_campaign, review_response', () => {
    expect(PUBLISHABLE_TOOLS).not.toContain('google_ad')
    expect(PUBLISHABLE_TOOLS).not.toContain('email_campaign')
    expect(PUBLISHABLE_TOOLS).not.toContain('review_response')
  })
})
