import { getSession } from '@/lib/auth'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const db = tenantPrisma(session)

  const { id } = await params
  const entries = await db.timeEntry.findMany({
    where: { jobId: id },
    include: { tech: { select: { name: true, initials: true } } },
    orderBy: { startedAt: 'asc' },
  })

  return Response.json(entries)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const db = tenantPrisma(session)

  const { id } = await params
  const tenantFilter = getTenantFilter(session)
  const job = await db.job.findFirst({ where: { id, ...tenantFilter } })
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  if (body.action === 'stop') {
    const open = await db.timeEntry.findFirst({
      where: { jobId: id, techId: session.id, endedAt: null },
    })
    if (!open) return Response.json({ error: 'No active time entry' }, { status: 404 })

    const endedAt = new Date()
    const minutes = Math.max(1, Math.round((endedAt.getTime() - open.startedAt.getTime()) / 60000))
    const entry = await db.timeEntry.update({
      where: { id: open.id },
      data: { endedAt, minutes },
      include: { tech: { select: { name: true, initials: true } } },
    })
    return Response.json(entry)
  }

  // Check for existing open entry for this tech on this job
  const existing = await db.timeEntry.findFirst({
    where: { jobId: id, techId: session.id, endedAt: null },
  })
  if (existing) return Response.json({ error: 'Already clocked in on this job' }, { status: 409 })

  const entry = await db.timeEntry.create({
    data: {
      jobId: id,
      techId: session.id,
      startedAt: new Date(),
      tenantId: session.tenantId,
    },
    include: { tech: { select: { name: true, initials: true } } },
  })

  return Response.json(entry, { status: 201 })
}
