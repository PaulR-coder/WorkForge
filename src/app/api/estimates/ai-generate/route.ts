import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { checkLimit, recordTokens } from '@/lib/tokenUsage'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const GenerateSchema = z.object({
  client:      z.string().max(200).optional(),
  jobType:     z.string().max(100).optional(),
  description: z.string().min(5).max(2000),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'createEstimate')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'AI not configured' }, { status: 503 })
  }

  if (session.tenantId) {
    const { allowed, used } = await checkLimit(session.tenantId)
    if (!allowed) {
      return Response.json({ error: `Monthly AI token limit reached (${used.toLocaleString()} used). Resets next month.` }, { status: 429 })
    }
  }

  const raw = await req.json().catch(() => null)
  if (!raw) return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  const gr = GenerateSchema.safeParse(raw)
  if (!gr.success) return Response.json({ error: gr.error.issues[0].message }, { status: 400 })
  const { client, jobType, description } = gr.data

  const anthropic = new Anthropic()

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are a field service estimating assistant specializing in HVAC, electrical, plumbing, refrigeration, and general industrial maintenance.

Generate realistic estimate line items for this service call:
Client: ${client || 'Unknown'}
Job Type: ${jobType || 'General Service'}
Description: ${description}

Return ONLY a valid JSON array with no markdown, no explanation. Each object must have:
- "description" (string) — specific item name
- "unitPrice" (number) — price per unit in USD
- "total" (number) — line total in USD
- "hours" (number, optional) — labor hours (for labor lines)
- "qty" (number, optional) — quantity (for parts/materials lines)

Include 3–6 line items typical for this type of job. Be realistic with pricing.`,
    }],
  })

  if (session.tenantId) {
    await recordTokens(session.tenantId, message.usage.input_tokens, message.usage.output_tokens)
  }

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'

  // Strip markdown code fences if model wraps in them
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    const lineItems = JSON.parse(cleaned)
    if (!Array.isArray(lineItems)) return Response.json({ error: 'Invalid AI response' }, { status: 500 })
    // Add stable IDs
    const tagged = lineItems.map((item, i) => ({ id: `ai-${Date.now()}-${i}`, ...item }))
    return Response.json({ lineItems: tagged })
  } catch {
    return Response.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }
}
