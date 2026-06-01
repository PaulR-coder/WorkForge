import Anthropic from '@anthropic-ai/sdk'
import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { checkLimit, recordTokens } from '@/lib/tokenUsage'
import { buildGeneratePrompt } from '@/lib/social/generate-prompts'
import { z } from 'zod'

const GenerateSchema = z.object({
  tool: z.string().min(1),
  inputs: z.record(z.string(), z.string()),
})

export async function POST(request: Request) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageSettings')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const raw = await request.json().catch(() => null)
  if (!raw) return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  const gr = GenerateSchema.safeParse(raw)
  if (!gr.success) return Response.json({ error: gr.error.issues[0].message }, { status: 400 })
  const { tool, inputs } = gr.data

  let prompt: string
  try {
    prompt = buildGeneratePrompt(tool, inputs)
  } catch {
    return Response.json({ error: `Unknown tool: ${tool}` }, { status: 400 })
  }

  if (session.tenantId) {
    const { allowed, used } = await checkLimit(session.tenantId)
    if (!allowed) {
      return Response.json(
        { error: `Monthly AI token limit reached (${used.toLocaleString()} used). Resets next month.` },
        { status: 429 }
      )
    }
  }

  let totalInputTokens = 0
  let totalOutputTokens = 0

  try {
    const first = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    totalInputTokens += first.usage.input_tokens
    totalOutputTokens += first.usage.output_tokens

    const text = first.content[0].type === 'text' ? first.content[0].text : ''
    let variations: unknown[]

    try {
      variations = JSON.parse(text) as unknown[]
    } catch {
      // Retry with explicit correction
      const retry = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: prompt },
          { role: 'assistant', content: text },
          { role: 'user', content: 'Your response was not valid JSON. Return ONLY the raw JSON array, no markdown, no code fences, no explanation.' },
        ],
      })
      totalInputTokens += retry.usage.input_tokens
      totalOutputTokens += retry.usage.output_tokens
      const retryText = retry.content[0].type === 'text' ? retry.content[0].text : ''
      variations = JSON.parse(retryText) as unknown[]
    }

    if (!Array.isArray(variations) || variations.length !== 3) {
      return Response.json({ error: 'AI returned unexpected format. Please try again.' }, { status: 500 })
    }

    if (session.tenantId) {
      await recordTokens(session.tenantId, totalInputTokens, totalOutputTokens)
    }

    return Response.json({ variations })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Generation failed: ${message}` }, { status: 500 })
  }
}
