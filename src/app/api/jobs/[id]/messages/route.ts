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

  const messages = await prisma.message.findMany({
    where: { jobId: id },
    include: { author: { select: { name: true, initials: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return Response.json(messages)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { body } = await req.json()
  if (!body?.trim()) return Response.json({ error: 'Empty message' }, { status: 400 })

  const tenantFilter = getTenantFilter(session)
  const job = await prisma.job.findFirst({ where: { id, ...tenantFilter } })
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })

  const message = await prisma.message.create({
    data: { jobId: id, authorId: session.id, body: body.trim(), tenantId: session.tenantId },
    include: { author: { select: { name: true, initials: true, role: true } } },
  })

  return Response.json(message, { status: 201 })
}
