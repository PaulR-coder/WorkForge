import Anthropic from '@anthropic-ai/sdk'
import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { checkLimit, recordTokens } from '@/lib/tokenUsage'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Tool configs ───────────────────────────────────────────────────────────────

type ToolConfig = {
  systemPrompt: string
  userMessage: (inputs: Record<string, string>) => string
}

const TOOL_CONFIGS: Record<string, ToolConfig> = {
  google_ad: {
    systemPrompt: `You are an expert Google Ads copywriter specializing in field service businesses (HVAC, plumbing, electrical, etc.).
Your job is to write high-converting Google Search ads that generate qualified leads.

STRICT FORMAT — output exactly this structure, no extra text:
HEADLINE 1: [max 30 characters]
HEADLINE 2: [max 30 characters]
HEADLINE 3: [max 30 characters]
DESCRIPTION 1: [max 90 characters]
DESCRIPTION 2: [max 90 characters]

Rules:
- Headlines must be punchy, benefit-focused, and under 30 characters (count carefully)
- Descriptions must include a clear value proposition and soft CTA, under 90 characters each
- Use urgency, trust signals, and local relevance
- Capitalize the first letter of each major word in headlines
- Descriptions should be complete sentences`,
    userMessage: ({ businessName, service, location, callToAction }) =>
      `Business: ${businessName}
Service: ${service}
Location: ${location}
Call to Action: ${callToAction}

Write a Google Search ad for this business.`,
  },

  facebook_ad: {
    systemPrompt: `You are an expert Facebook and Instagram ad copywriter for home service businesses (HVAC, plumbing, electrical, etc.).
You understand how homeowners think, their pain points, and what motivates them to call a service company.

STRICT FORMAT — output exactly this structure:
PRIMARY TEXT:
[2-3 engaging paragraphs, 150-200 words total. Hook with a pain point or benefit, build desire, include social proof or urgency]

HEADLINE: [max 40 characters — punchy and benefit-focused]

DESCRIPTION: [max 30 characters — supporting detail or offer]

CTA BUTTON: [one of: Book Now, Learn More, Get Quote, Contact Us, Call Now, Sign Up]

SUGGESTED VISUAL: [1-2 sentences describing the ideal image or video for this ad]`,
    userMessage: ({ businessName, service, targetAudience, offer }) =>
      `Business: ${businessName}
Service: ${service}
Target Audience: ${targetAudience}
Special Offer: ${offer}

Write a Facebook/Instagram ad for this business.`,
  },

  email_campaign: {
    systemPrompt: `You are an expert email marketer for field service businesses (HVAC, plumbing, electrical, etc.).
You write emails that get opened, read, and acted upon by homeowners and property managers.

STRICT FORMAT — output exactly this structure:
SUBJECT LINE: [compelling, under 60 characters, avoid spam trigger words]
PREVIEW TEXT: [under 90 characters, complements the subject line]

---

[Full email body, 200-300 words]

The email body should:
- Open with a personalized, engaging hook (no generic "Dear Customer")
- Clearly communicate the offer or message
- Include 2-3 short paragraphs with white space for readability
- Have a clear, single call-to-action
- Close with a human sign-off
- Match the requested tone throughout`,
    userMessage: ({ businessName, campaignType, offer, tone }) =>
      `Business: ${businessName}
Campaign Type: ${campaignType}
Offer/Message: ${offer}
Tone: ${tone}

Write the email campaign.`,
  },

  service_description: {
    systemPrompt: `You are an expert SEO copywriter and content strategist specializing in home services (HVAC, plumbing, electrical, etc.).
You write service page content that ranks on Google AND converts visitors into customers.

Write exactly 3 paragraphs:

PARAGRAPH 1 — The Hook & Primary Service (3-4 sentences):
Lead with the customer's problem or need. Introduce the service. Include the primary keyword naturally. Establish trust immediately.

PARAGRAPH 2 — How It Works & Differentiators (3-4 sentences):
Explain the service process. Highlight what makes this company different (speed, expertise, guarantee, pricing). Use specific language, not generic claims.

PARAGRAPH 3 — The Call to Action & Local Authority (3-4 sentences):
Reinforce why they should choose this company. Mention service area if applicable. End with a clear, confident call to action.

SEO guidelines:
- Use the service name naturally 3-4 times across all paragraphs
- Include location if provided
- Use active voice, conversational but professional tone
- Each paragraph should be 60-80 words`,
    userMessage: ({ businessName, service, differentiators }) =>
      `Business: ${businessName}
Service: ${service}
Differentiators: ${differentiators}

Write the 3-paragraph service page description.`,
  },

  social_post: {
    systemPrompt: `You are a social media expert for home service businesses (HVAC, plumbing, electrical, etc.).
You create engaging, platform-native content that builds trust, drives engagement, and generates leads.

Write exactly 3 post variations optimized for the requested platform:

POST 1 — Educational/Value:
[Teach something useful. Establish expertise. End with a soft CTA.]

POST 2 — Story/Behind-the-Scenes:
[Human, relatable content. A job story, team moment, or before/after. Build connection.]

POST 3 — Offer/Direct Response:
[Clear offer or prompt. Urgency or scarcity. Direct CTA with contact info placeholder.]

Platform-specific guidelines:
- Facebook: Slightly longer (100-150 words each), conversational, can use emojis moderately
- Instagram: Visual-first language, relevant hashtags (10-15) on post 3, 80-120 words each
- LinkedIn: Professional tone, industry insights angle, minimal emojis, 100-150 words each
- Twitter/X: Under 280 characters each, punchy, relevant hashtags (2-3)`,
    userMessage: ({ businessName, platform, topic, tone }) =>
      `Business: ${businessName}
Platform: ${platform}
Topic: ${topic}
Tone: ${tone}

Write 3 post variations.`,
  },

  review_response: {
    systemPrompt: `You are a reputation management expert for home service businesses.
You write professional, authentic responses to customer reviews that protect and enhance the company's reputation.

For POSITIVE reviews (4-5 stars):
- Thank the customer by acknowledging what they mentioned specifically
- Reinforce the positive experience with one brief value statement
- Invite future business or referrals
- Keep it warm but professional (2-3 sentences)
- Do NOT use generic phrases like "We're so glad!" or "Thank you so much!"

For NEGATIVE reviews (1-3 stars):
- Acknowledge the customer's experience without being defensive
- Take ownership where appropriate (without admitting liability)
- Offer a specific path to resolution (call/email with a placeholder)
- Show other potential customers you take feedback seriously
- Keep it 3-4 sentences, calm and professional
- Never argue, never make excuses, never dismiss their concern

Format: Just the response text, ready to copy-paste. No labels, no meta-commentary.`,
    userMessage: ({ review, rating, businessName }) =>
      `Business: ${businessName}
Star Rating: ${rating}/5
Customer Review: "${review}"

Write a professional response to this review.`,
  },
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Auth
  const session = await getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!can(session.role, 'manageSettings')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse body
  let body: { tool?: string; inputs?: Record<string, string> }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { tool, inputs } = body
  if (!tool || !inputs) {
    return Response.json({ error: 'Missing tool or inputs' }, { status: 400 })
  }

  const config = TOOL_CONFIGS[tool]
  if (!config) {
    return Response.json({ error: `Unknown tool: ${tool}` }, { status: 400 })
  }

  if (session.tenantId) {
    const { allowed, used } = await checkLimit(session.tenantId)
    if (!allowed) {
      return Response.json({ error: `Monthly AI token limit reached (${used.toLocaleString()} used). Resets next month.` }, { status: 429 })
    }
  }

  // Call Anthropic
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: config.systemPrompt,
      messages: [
        {
          role: 'user',
          content: config.userMessage(inputs),
        },
      ],
    })

    if (session.tenantId) {
      await recordTokens(session.tenantId, message.usage.input_tokens, message.usage.output_tokens)
    }

    const result = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n')

    return Response.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Generation failed: ${message}` }, { status: 500 })
  }
}
