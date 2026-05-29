import OpenAI from 'openai'
import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { z } from 'zod'

const GenerateSchema = z.object({
  prompt: z.string().min(1).max(4000),
  style: z.enum(['photo', 'graphic', 'illustration']),
})

const STYLE_SUFFIX = {
  photo: 'Professional photo, photorealistic, high quality commercial photography',
  graphic: 'Bold vector graphic, vibrant colors, flat design, marketing poster style',
  illustration: 'Clean digital illustration, friendly and professional, modern style',
} as const

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageSettings')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const raw = await request.json().catch(() => null)
  if (!raw) return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  const gr = GenerateSchema.safeParse(raw)
  if (!gr.success) return Response.json({ error: gr.error.issues[0].message }, { status: 400 })
  const { prompt, style } = gr.data

  const fullPrompt = `${prompt}. ${STYLE_SUFFIX[style]}`

  try {
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: fullPrompt,
      size: '1024x1024',
      quality: 'high',
    })

    const imageUrl = response.data?.[0]?.url
    if (!imageUrl) return Response.json({ error: 'No image returned from API' }, { status: 500 })

    return Response.json({ imageUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Image generation failed: ${message}` }, { status: 500 })
  }
}
