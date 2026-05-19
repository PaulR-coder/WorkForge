import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tenantFilter = getTenantFilter(session)
  const job = await prisma.job.findFirst({ where: { id, ...tenantFilter } })
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })

  const photos = await prisma.photo.findMany({
    where: { jobId: id },
    select: { id: true, data: true, mimeType: true, createdAt: true, author: { select: { name: true, initials: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return Response.json(photos)
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data } = await req.json()

  if (!data || typeof data !== 'string') {
    return Response.json({ error: 'Invalid image data' }, { status: 400 })
  }

  // Extract and validate MIME type from the data URI itself — never trust client-supplied mimeType
  const mimeMatch = data.match(/^data:(image\/[a-z0-9.+-]+);base64,/)
  if (!mimeMatch) return Response.json({ error: 'Invalid image format' }, { status: 400 })
  const mimeType = mimeMatch[1]
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return Response.json({ error: 'Unsupported image type' }, { status: 415 })
  }

  // Sanity-check size: base64 of 4MB = ~5.5MB string
  if (data.length > 6_000_000) {
    return Response.json({ error: 'Image too large' }, { status: 413 })
  }

  const tenantFilter = getTenantFilter(session)
  const job = await prisma.job.findFirst({ where: { id, ...tenantFilter } })
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })

  const photo = await prisma.photo.create({
    data: {
      jobId: id,
      authorId: session.id,
      data,
      mimeType,
      tenantId: session.tenantId,
    },
    select: { id: true, data: true, mimeType: true, createdAt: true, author: { select: { name: true, initials: true } } },
  })

  return Response.json(photo, { status: 201 })
}
