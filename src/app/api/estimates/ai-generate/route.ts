import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { checkLimit, recordTokens } from '@/lib/tokenUsage'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { apiError } from '@/lib/apiError'

const GenerateSchema = z.object({
  client:      z.string().max(200).optional(),
  jobType:     z.string().max(100).optional(),
  description: z.string().min(1).max(2000),
  trade:       z.string().max(100).optional(),
  sqft:        z.number().positive().optional(),
  jobMode:     z.enum(['new_construction', 'remodel', 'repair']).optional(),
  finishLevel: z.string().max(50).optional(),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)
  if (!can(session.role, 'createEstimate')) return apiError('Forbidden', 403)

  if (!process.env.ANTHROPIC_API_KEY) {
    return apiError('AI not configured', 503, 'AI_UNAVAILABLE')
  }

  if (session.tenantId) {
    const { allowed, used } = await checkLimit(session.tenantId)
    if (!allowed) {
      return apiError(`Monthly AI token limit reached (${used.toLocaleString()} used). Resets next month.`, 429, 'AI_LIMIT_REACHED')
    }
  }

  const raw = await req.json().catch(() => null)
  if (!raw) return apiError('Invalid JSON', 400)
  const gr = GenerateSchema.safeParse(raw)
  if (!gr.success) return apiError(gr.error.issues[0].message, 400)
  const { client, jobType, description, trade, sqft, jobMode, finishLevel } = gr.data

  const anthropic = new Anthropic()

  const isConstruction = !!trade

  const constructionRates: Record<string, string> = {
    'Painting': `Interior walls: $1.50–$3.50/sqft labor. New construction higher end. Remodel lower end. Include: surface prep labor, primer coat, 2 finish coats on walls, semi-gloss on trim. Materials: ~1 gallon per 400 sqft per coat, Sherwin-Williams ProMar 200 ~$45/gallon, Kilz primer ~$30/gallon. Level 5 finish adds $0.50–$1.00/sqft.`,
    'Drywall': `Level 4 finish (standard): $1.75–$2.50/sqft. Level 5 (skim coat): $2.50–$3.25/sqft. Include: hang, tape, 3-coat finish, sand. Materials: 1/2" drywall ~$12/sheet (32 sqft), thinset/compound ~$0.15/sqft.`,
    'Demolition': `Full gut interior: $4–$8/sqft. Selective drywall removal only: $1–$1.75/sqft. Flooring removal: $0.75–$1.50/sqft. Include debris hauling if dumpster not on site.`,
    'Tile': `Standard floor tile install (labor only): $5–$8/sqft. Large format 18"+ add $2/sqft. Wall tile: $8–$14/sqft. Full shower (floor+walls): $12–$20/sqft. Include: thinset, grout, Schluter trim, waterproofing membrane if shower.`,
    'Flooring - LVP': `LVP click-lock install (labor only): $1.50–$3.00/sqft. Include: underlayment if needed, transitions (T-molding ~$35 each), subfloor prep if needed.`,
    'Flooring - Hardwood': `Engineered hardwood floating: $2–$3.50/sqft labor. Nail-down: $3–$5/sqft. Include: moisture barrier over slab, transitions.`,
    'Flooring - Carpet': `Carpet install (labor only): $0.50–$1.00/sqft. Include: pad stapling, tack strips, power stretch, seaming.`,
  }

  const rateNote = trade && constructionRates[trade] ? constructionRates[trade] : ''
  const jobModeLabel = jobMode === 'new_construction' ? 'New Construction' : jobMode === 'remodel' ? 'Remodel/Renovation' : jobMode === 'repair' ? 'Repair' : ''

  const prompt = isConstruction
    ? `You are a construction subcontractor estimating assistant for a Tampa, FL painting, drywall, demolition, tile, and flooring subcontracting company. Generate a realistic, line-item bid for this job.

Trade: ${trade}
Job Type: ${jobModeLabel || jobType || 'General'}
Square Footage: ${sqft ? `${sqft} sqft` : 'unknown'}
Finish Level: ${finishLevel || 'standard'}
Client/GC: ${client || 'General Contractor'}
Additional Details: ${description || 'None'}

Pricing reference for this trade:
${rateNote}

Instructions:
- Calculate labor using sqft × appropriate rate for this trade and job type
- Include materials as separate line items if applicable (materials at cost + 15% markup)
- Add any specialty items relevant to this trade (primer, cement board, waterproofing, transitions, etc.)
- Use realistic Tampa market pricing — not too low, not too high
- Generate 3–6 line items total
- For labor lines use "hours" field (estimate realistic crew-hours); for material lines use "qty" field

Return ONLY a valid JSON array with no markdown. Each object must have:
- "description" (string) — specific item name
- "unitPrice" (number) — price per unit in USD
- "total" (number) — line total in USD
- "hours" (number, optional) — labor hours for labor lines
- "qty" (number, optional) — quantity for material/supply lines`
    : `You are a field service estimating assistant specializing in HVAC, electrical, plumbing, refrigeration, and general industrial maintenance.

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

Include 3–6 line items typical for this type of job. Be realistic with pricing.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  if (session.tenantId) {
    await recordTokens(session.tenantId, message.usage.input_tokens, message.usage.output_tokens)
  }

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'

  // Strip markdown code fences if model wraps in them
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    const lineItems = JSON.parse(cleaned)
    if (!Array.isArray(lineItems)) return apiError('Invalid AI response', 500)
    // Add stable IDs
    const tagged = lineItems.map((item, i) => ({ id: `ai-${Date.now()}-${i}`, ...item }))
    return Response.json({ lineItems: tagged })
  } catch {
    return apiError('Failed to parse AI response', 500, undefined, { raw: text })
  }
}
