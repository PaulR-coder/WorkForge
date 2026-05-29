export type ToolId =
  | 'google_ad'
  | 'facebook_ad'
  | 'email_campaign'
  | 'service_description'
  | 'social_post'
  | 'review_response'

// Tools whose output can be published to social platforms
export const PUBLISHABLE_TOOLS: ToolId[] = ['social_post', 'facebook_ad', 'service_description']

export function buildGeneratePrompt(tool: string, inputs: Record<string, string>): string {
  switch (tool) {
    case 'google_ad':
      return `You are a Google Ads copywriter for field service businesses.

Business: ${inputs.businessName}
Service: ${inputs.service}
Location: ${inputs.location}
CTA: ${inputs.callToAction}

Return ONLY a JSON array of exactly 3 ad variations. No markdown. No explanation.
Schema: [{"headline1":"","headline2":"","headline3":"","description1":"","description2":""},...]

Rules:
- headline1/2/3: max 30 characters each (count precisely)
- description1/2: max 90 characters each (count precisely)
- Each variation must be meaningfully different in angle/tone
- Use location naturally in at least one headline per variation
- Strong CTAs: "Call Today", "Free Quote", "Same-Day Service"`

    case 'facebook_ad':
      return `You are a Facebook/Instagram ad copywriter for field service businesses.

Business: ${inputs.businessName}
Service: ${inputs.service}
Target Audience: ${inputs.targetAudience}
Offer: ${inputs.offer}

Return ONLY a JSON array of exactly 3 ad variations. No markdown. No explanation.
Schema: [{"primaryText":"","headline":"","linkDescription":""},...]

Rules:
- primaryText: max 125 characters, engaging hook with benefit
- headline: max 40 characters, punchy and benefit-focused
- linkDescription: max 30 characters, supporting detail
- Each variation must use a different angle (urgency, social proof, benefit)`

    case 'email_campaign':
      return `You are an email marketer for field service businesses.

Business: ${inputs.businessName}
Campaign Type: ${inputs.campaignType}
Offer/Message: ${inputs.offer}
Tone: ${inputs.tone}

Return ONLY a JSON array of exactly 3 email variations. No markdown. No explanation.
Schema: [{"subjectLine":"","previewText":"","body":""},...]

Rules:
- subjectLine: max 60 characters, avoid spam words
- previewText: max 90 characters, complements subject
- body: 200-300 words, clear CTA, human sign-off
- Each variation must have a meaningfully different angle or hook`

    case 'service_description':
      return `You are an SEO copywriter for home service businesses.

Business: ${inputs.businessName}
Service: ${inputs.service}
Differentiators: ${inputs.differentiators}

Return ONLY a JSON array of exactly 3 service description variations. No markdown. No explanation.
Schema: [{"pageHeadline":"","bodyCopy":"","metaDescription":""},...]

Rules:
- pageHeadline: compelling H1, includes service name
- bodyCopy: 3 paragraphs (hook, differentiators, CTA), 180-240 words total
- metaDescription: max 160 characters, includes service + location if available
- Each variation must use a different angle or emphasis`

    case 'social_post':
      return `You are a social media expert for field service businesses.

Business: ${inputs.businessName}
Platform: ${inputs.platform}
Topic: ${inputs.topic}
Tone: ${inputs.tone}

Return ONLY a JSON array of exactly 3 post variations. No markdown. No explanation.
Schema: [{"caption":"","hashtags":[]},...]

Rules:
- caption: platform-appropriate length (Instagram: 2200, Facebook: 500, LinkedIn: 700, Twitter/X: 280 chars max)
- hashtags: array of strings without # prefix, 0 for Twitter/Facebook, 10-15 for Instagram, 3-5 for LinkedIn
- Each variation must use a different angle: educational, story/behind-the-scenes, promotional`

    case 'review_response':
      return `You are a reputation management expert for field service businesses.

Business: ${inputs.businessName}
Star Rating: ${inputs.rating}/5
Customer Review: "${inputs.review}"

Return ONLY a JSON array of exactly 3 response variations. No markdown. No explanation.
Schema: [{"response":""},...]

Rules:
- response: 2-4 sentences, professional and authentic
- For positive reviews: thank specifically, reinforce value, invite return
- For negative reviews: acknowledge, take ownership, offer resolution path
- Each variation must have a meaningfully different tone or emphasis`

    default:
      throw new Error(`Unknown tool: ${tool}`)
  }
}
