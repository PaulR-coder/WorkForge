import OpenAI from 'openai'
import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { requireTenantId } from '@/lib/tenant'
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

const IMAGE_MONTHLY_LIMIT = 20

export async function POST(request: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageSettings')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const raw = await request.json().catch(() => null)
  if (!raw) return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  const gr = GenerateSchema.safeParse(raw)
  if (!gr.success) return Response.json({ error: gr.error.issues[0].message }, { status: 400 })
  const { prompt, style } = gr.data

  // Check + enforce monthly image generation limit
  const tenantId = requireTenantId(session)
  const period = new Date().toISOString().slice(0, 7) // "YYYY-MM"
  const db = tenantPrisma(session)
  const usage = await db.tenantTokenUsage.findUnique({
    where: { tenantId_period: { tenantId, period } },
    select: { imageGenerations: true },
  })
  if ((usage?.imageGenerations ?? 0) >= IMAGE_MONTHLY_LIMIT) {
    return Response.json(
      { error: `Monthly image limit reached (${IMAGE_MONTHLY_LIMIT}/month). Resets on the 1st.` },
      { status: 429 },
    )
  }

  const fullPrompt = `${prompt}. ${STYLE_SUFFIX[style]}`

  try {
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: fullPrompt,
      size: '1024x1024',
      quality: 'low',
    })

    const imageUrl = response.data?.[0]?.url
    if (!imageUrl) return Response.json({ error: 'No image returned from API' }, { status: 500 })

    // Increment counter after successful generation
    await db.tenantTokenUsage.upsert({
      where: { tenantId_period: { tenantId, period } },
      create: { tenantId, period, imageGenerations: 1 },
      update: { imageGenerations: { increment: 1 } },
    })

    return Response.json({ imageUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Image generation failed: ${message}` }, { status: 500 })
  }
}
