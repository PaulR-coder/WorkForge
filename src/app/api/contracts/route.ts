import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getTenantFilter, requireTenantId } from '@/lib/tenant'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'viewContracts')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const tenantFilter = getTenantFilter(session)
  const contracts = await prisma.contract.findMany({ where: tenantFilter, orderBy: { nextDueDate: 'asc' } })
  return Response.json(contracts)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'editContracts')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const tenantId = requireTenantId(session)

  const contract = await prisma.contract.create({
    data: {
      client: body.client,
      name: body.name,
      icon: body.icon ?? '📑',
      units: body.units ?? 1,
      techInitials: body.techInitials ?? '',
      frequencyDays: body.frequencyDays ?? 90,
      pricePerVisit: body.pricePerVisit,
      nextDueDate: new Date(body.nextDueDate),
      notes: body.notes ?? '',
      tenantId,
    },
  })

  await prisma.auditLog.create({
    data: { icon: '📑', action: 'Contract created', detail: `${contract.name} — ${contract.client}`, severity: 'info', userId: session.id, tenantId },
  })

  return Response.json(contract, { status: 201 })
}
