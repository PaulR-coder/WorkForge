import Anthropic from '@anthropic-ai/sdk'
import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { z } from 'zod'

const PromptSchema = z.object({
  tool: z.string().min(1),
  inputs: z.record(z.string(), z.string()),
  selectedVariation: z.record(z.string(), z.unknown()),
})

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageSettings')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const raw = await request.json().catch(() => null)
  if (!raw) return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  const pr = PromptSchema.safeParse(raw)
  if (!pr.success) return Response.json({ error: pr.error.issues[0].message }, { status: 400 })
  const { tool, inputs, selectedVariation } = pr.data

  const business = inputs.businessName ?? 'a local service business'
  const service = inputs.service ?? inputs.topic ?? tool.replace('_', ' ')
  const variationText = Object.values(selectedVariation).slice(0, 2).join(' — ')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Generate a one-paragraph DALL-E image prompt for a social media post.

Business: ${business}
Service/Topic: ${service}
Copy preview: "${variationText}"

Write a vivid, specific scene description for a professional marketing image. Focus on the visual elements: setting, people (if any), lighting, mood, composition. Do not include style instructions — just describe the scene. One paragraph, 3-5 sentences.`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    return Response.json({ prompt: text })
  } catch {
    return Response.json({ prompt: '' })
  }
}
