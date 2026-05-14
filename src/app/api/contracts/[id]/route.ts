import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'editContracts')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const contract = await prisma.contract.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.client !== undefined && { client: body.client }),
      ...(body.frequencyDays !== undefined && { frequencyDays: body.frequencyDays }),
      ...(body.pricePerVisit !== undefined && { pricePerVisit: body.pricePerVisit }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.active !== undefined && { active: body.active }),
    },
  })

  await prisma.auditLog.create({
    data: { icon: '📑', action: 'Contract updated', detail: `${contract.name} — ${contract.client}`, severity: 'info', userId: session.id },
  })

  return Response.json(contract)
}
