import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { checkLimit, recordTokens } from '@/lib/tokenUsage'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const SYSTEM_PROMPT = `You are a document parser for WorkForge, a field service management app used by HVAC, plumbing, electrical, roofing, and similar service companies.

Extract structured business data from uploaded documents: contracts, estimates/quotes, invoices, work orders, job tickets, or handwritten notes.

Return ONLY valid JSON — no markdown, no explanation, nothing else before or after the JSON.

Schema:
{
  "documentType": "estimate" | "job" | "invoice",
  "confidence": "high" | "medium" | "low",
  "data": { ... }
}

If documentType is "estimate":
data = {
  "client": "customer name or business name",
  "clientEmail": "email address or null",
  "jobType": "service type e.g. AC Repair, Plumbing Repair, Electrical Install",
  "description": "scope of work as a clear sentence",
  "lineItems": [
    { "id": "li1", "description": "item name", "hours": null_or_number, "qty": null_or_number, "unitPrice": number, "total": number }
  ],
  "subtotal": total_number,
  "notes": "payment terms or special notes, or null"
}

If documentType is "job":
data = {
  "client": "customer name",
  "phone": "phone number as string or null",
  "address": "service address or null",
  "jobType": "type of service",
  "description": "description of work to be done",
  "priority": "low" | "normal" | "high" | "urgent",
  "notes": "special instructions or null"
}

If documentType is "invoice":
data = {
  "client": "customer name",
  "clientEmail": "email or null",
  "labor": labor_charges_as_number,
  "parts": parts_and_materials_as_number,
  "surcharge": service_call_or_trip_fee_as_number,
  "notes": "payment terms or null"
}

Rules:
- Missing numbers → 0
- Missing strings → ""
- Default priority → "normal"
- Infer jobType from context when not stated
- For invoices: labor = work/installation/hourly charges; parts = materials/supplies/equipment; surcharge = service call fee/trip charge/dispatch fee
- For line items give each a unique id like "li1", "li2", etc.
- Even partial or unclear documents should return a best-effort extraction`

const ALLOWED_IMAGES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'importData')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'AI not configured — set ANTHROPIC_API_KEY' }, { status: 503 })
  }

  if (session.tenantId) {
    const { allowed, used } = await checkLimit(session.tenantId)
    if (!allowed) {
      return Response.json({ error: `Monthly AI token limit reached (${used.toLocaleString()} used). Resets next month.` }, { status: 429 })
    }
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

  const MAX_BYTES = 6 * 1024 * 1024
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'File too large — max 6 MB' }, { status: 413 })
  }

  const mime = file.type || ''
  const name = file.name || ''
  const isCSV = mime === 'text/csv' || mime === 'text/plain' || name.toLowerCase().endsWith('.csv')
  const isPDF = mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')
  const isImage = ALLOWED_IMAGES.has(mime)

  if (!isCSV && !isPDF && !isImage) {
    return Response.json(
      { error: 'Unsupported file type. Upload a PDF, image (JPG/PNG/WEBP), or CSV.' },
      { status: 415 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const anthropic = new Anthropic()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userContent: any[]

  if (isPDF) {
    const base64 = buffer.toString('base64')
    userContent = [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      },
      { type: 'text', text: 'Extract all business data from this document and return only the JSON schema.' },
    ]
  } else if (isImage) {
    const base64 = buffer.toString('base64')
    userContent = [
      {
        type: 'image',
        source: { type: 'base64', media_type: mime as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: base64 },
      },
      { type: 'text', text: 'Extract all business data from this document image and return only the JSON schema.' },
    ]
  } else {
    // CSV / plain text
    const text = buffer.toString('utf-8').slice(0, 12000)
    userContent = [
      {
        type: 'text',
        text: `This is a CSV or text file with business data:\n\n${text}\n\nExtract the primary record and return only the JSON schema. If the file contains multiple rows/records, extract the first meaningful record and note in the description that it contains a list.`,
      },
    ]
  }

  try {
    const message = await anthropic.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      },
      isPDF ? { headers: { 'anthropic-beta': 'pdfs-2024-09-25' } } : undefined,
    )

    if (session.tenantId) {
      await recordTokens(session.tenantId, message.usage.input_tokens, message.usage.output_tokens)
    }

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    const parsed = JSON.parse(cleaned)
    if (!parsed.documentType || !parsed.data) {
      return Response.json({ error: 'AI returned unexpected structure' }, { status: 500 })
    }

    // Ensure lineItems have stable IDs if missing
    if (parsed.documentType === 'estimate' && Array.isArray(parsed.data.lineItems)) {
      parsed.data.lineItems = parsed.data.lineItems.map((item: Record<string, unknown>, i: number) => ({
        id: item.id || `li${i + 1}`,
        ...item,
      }))
    }

    return Response.json(parsed)
  } catch (err) {
    console.error('Import analyze error:', err)
    return Response.json({ error: 'Failed to analyze document — try a clearer scan or different file' }, { status: 500 })
  }
}
