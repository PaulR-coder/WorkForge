import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter, requireTenantId } from '@/lib/tenant'
import { emailJobAssigned } from '@/lib/email'
import { smsJobAssigned } from '@/lib/sms'
import { sendPushToUser } from '@/lib/push'
import { cache } from '@/lib/cache'
import { z } from 'zod'

const CreateJobSchema = z.object({
  client: z.string().min(1),
  address: z.string().min(1),
  type: z.string().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  description: z.string().optional(),
  techId: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
})

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const techId = searchParams.get('techId')

  // Per-tenant cache key.  Techs see a filtered subset, so we include their
  // id in the key to prevent cross-user cache collisions.
  // When filtering by a specific techId (admin viewing a tech's jobs), include
  // that in the cache key as well.
  const cacheKey =
    session.role === 'tech'
      ? `jobs:${session.tenantId}:tech:${session.id}`
      : techId
        ? `jobs:${session.tenantId}:tech:${techId}`
        : `jobs:${session.tenantId}`

  const cached = await cache.get(cacheKey)
  if (cached !== null) return Response.json(cached)

  const db = tenantPrisma(session)

  const tenantFilter = getTenantFilter(session)
  const where = {
    ...tenantFilter,
    archivedAt: null,
    deletedAt: null,
    ...(session.role === 'tech' ? { techId: session.id } : techId ? { techId } : {}),
  }

  const jobs = await db.job.findMany({
    where,
    include: { tech: { select: { id: true, name: true, initials: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // TTL 30 s — short enough that a job status change feels near-instant,
  // long enough to absorb repeated page-loads / polling from multiple clients.
  await cache.set(cacheKey, jobs, 30)

  return Response.json(jobs)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'createJob')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  const result = CreateJobSchema.safeParse(body)
  if (!result.success) return Response.json({ error: result.error.issues[0].message }, { status: 400 })

  const tenantId = requireTenantId(session)
  const tenantFilter = getTenantFilter(session)

  if (result.data.techId != null) {
    const tech = await db.user.findFirst({ where: { id: result.data.techId, ...tenantFilter } })
    if (!tech) return Response.json({ error: 'Invalid technician' }, { status: 400 })
  }

  const job = await db.job.create({
    data: {
      client: result.data.client,
      address: result.data.address,
      description: result.data.description ?? '',
      type: result.data.type,
      priority: result.data.priority ?? 'normal',
      status: 'open',
      techId: result.data.techId ?? null,
      tenantId,
    },
    include: { tech: { select: { id: true, name: true, initials: true, email: true, phone: true } } },
  })

  await db.auditLog.create({
    data: { icon: '🔧', action: 'Job created', detail: `${job.client} — ${job.type}`, severity: 'info', userId: session.id, tenantId },
  })

  if (job.tech) {
    const jobData = { client: job.client, address: job.address, type: job.type, priority: job.priority }
    void emailJobAssigned(job.tech.email, job.tech.name, jobData)
    if (job.tech.phone) void smsJobAssigned(job.tech.phone, jobData)
    const subs = await db.pushSubscription.findMany({ where: { userId: job.tech.id } })
    if (subs.length > 0) {
      void sendPushToUser(subs, {
        title: 'New Job Assigned',
        body: `${job.type} — ${job.client} · ${job.address.split(',')[0]}`,
        url: '/field',
      })
    }
  }

  // Invalidate the jobs list for this tenant (all roles) so the next GET
  // reflects the new job.  Tech-scoped keys share the same prefix so we use
  // flush() rather than a single del().
  await cache.flush(`jobs:${tenantId}*`)

  return Response.json({ ...job, tech: job.tech ? { id: job.tech.id, name: job.tech.name, initials: job.tech.initials } : null }, { status: 201 })
}
