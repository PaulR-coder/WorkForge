import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { rateLimit, getIp } from '@/lib/rateLimit'
import { getSession } from '@/lib/auth'
import { recordTokens } from '@/lib/tokenUsage'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are a helpful support agent for WorkForge, a field service management platform for HVAC, plumbing, electrical, and similar businesses. Answer questions clearly and concisely. Focus on practical guidance. If a question is unrelated to WorkForge or field service management, politely redirect. Keep responses under 200 words.`

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const { ok, retryAfter } = await rateLimit(`help-ask:${ip}`, 10, 60 * 1000)

  if (!ok) {
    return NextResponse.json(
      { error: `Too many requests. Please wait ${retryAfter} seconds before trying again.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { question } = body as { question?: unknown }

  if (typeof question !== 'string' || question.trim().length < 5) {
    return NextResponse.json(
      { error: 'Question must be at least 5 characters.' },
      { status: 400 }
    )
  }

  if (question.length > 500) {
    return NextResponse.json(
      { error: 'Question must be 500 characters or fewer.' },
      { status: 400 }
    )
  }

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: question.trim() }],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              )
            }
          }
          const final = await stream.finalMessage()
          const sess = await getSession()
          if (sess?.tenantId) {
            await recordTokens(sess.tenantId, final.usage.input_tokens, final.usage.output_tokens)
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[help/ask] Anthropic error:', err)
    return NextResponse.json(
      { error: 'AI service is temporarily unavailable. Please try again in a moment.' },
      { status: 503 }
    )
  }
}
