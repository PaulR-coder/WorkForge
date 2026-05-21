import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'createJob')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const db = tenantPrisma(session)

  const { id } = await params
  const tenantFilter = getTenantFilter(session)
  const estimate = await db.estimate.findFirst({ where: { id, ...tenantFilter } })
  if (!estimate) return Response.json({ error: 'Not found' }, { status: 404 })

  if (estimate.jobId) {
    return Response.json({ error: 'A job already exists for this estimate', jobId: estimate.jobId }, { status: 409 })
  }

  const body = await req.json().catch(() => ({}))

  const job = await db.job.create({
    data: {
      client: estimate.client,
      address: body.address ?? '',
      type: estimate.jobType || 'Service',
      description: estimate.description,
      priority: 'normal',
      status: 'open',
      tenantId: session.tenantId,
    },
  })

  await db.estimate.update({
    where: { id },
    data: { jobId: job.id, status: 'approved' },
  })

  void db.auditLog.create({
    data: {
      icon: '🔧', action: 'Job created from estimate', severity: 'info',
      detail: `${estimate.number} → Job ${job.id}`,
      userId: session.id, tenantId: session.tenantId,
    },
  })

  return Response.json({ ok: true, jobId: job.id }, { status: 201 })
}
