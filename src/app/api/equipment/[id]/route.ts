import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'editEquipment')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const eq = await prisma.equipment.update({
    where: { id },
    data: {
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.lastPMDaysAgo !== undefined && { lastPMDaysAgo: body.lastPMDaysAgo }),
      ...(body.totalServices !== undefined && { totalServices: body.totalServices }),
    },
  })

  return Response.json(eq)
}
