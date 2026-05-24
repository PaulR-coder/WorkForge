import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter, requireTenantId } from '@/lib/tenant'
import { z } from 'zod'
import { apiError } from '@/lib/apiError'

const CreateContractSchema = z.object({
  client: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().optional(),
  units: z.number().int().min(1),
  frequencyDays: z.number().int().min(1),
  pricePerVisit: z.number().min(0),
  nextDueDate: z.string().min(1),
  notes: z.string().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)
  if (!can(session.role, 'viewContracts')) return apiError('Forbidden', 403)
  const db = tenantPrisma(session)

  const tenantFilter = getTenantFilter(session)
  const contracts = await db.contract.findMany({ where: tenantFilter, orderBy: { nextDueDate: 'asc' } })
  return Response.json(contracts)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)
  if (!can(session.role, 'editContracts')) return apiError('Forbidden', 403)
  const db = tenantPrisma(session)

  const body = await req.json().catch(() => null)
  if (!body) return apiError('Invalid JSON', 400)
  const result = CreateContractSchema.safeParse(body)
  if (!result.success) return apiError(result.error.issues[0].message, 400)

  const tenantId = requireTenantId(session)

  const nextDueDate = new Date(result.data.nextDueDate)
  if (isNaN(nextDueDate.getTime())) {
    return apiError('Invalid due date', 400)
  }

  const contract = await db.contract.create({
    data: {
      client: result.data.client,
      name: result.data.name,
      icon: result.data.icon ?? '📑',
      units: result.data.units,
      techInitials: typeof body.techInitials === 'string' ? body.techInitials : '',
      frequencyDays: result.data.frequencyDays,
      pricePerVisit: result.data.pricePerVisit,
      nextDueDate,
      notes: result.data.notes ?? '',
      tenantId,
    },
  })

  await db.auditLog.create({
    data: { icon: '📑', action: 'Contract created', detail: `${contract.name} — ${contract.client}`, severity: 'info', userId: session.id, tenantId },
  })

  return Response.json(contract, { status: 201 })
}
