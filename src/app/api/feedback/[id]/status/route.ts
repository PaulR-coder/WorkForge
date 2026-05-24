import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/apiError'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)
  if (!can(session.role, 'manageSettings')) return apiError('Forbidden', 403)

  const { id } = await params
  const { status } = await req.json()

  const VALID_STATUSES = ['pending', 'planned', 'in_progress', 'done', 'rejected']
  if (!VALID_STATUSES.includes(status)) {
    return apiError('Invalid status', 400)
  }

  const updated = await prisma.featureRequest.update({
    where: { id },
    data: { status },
    include: {
      user: { select: { name: true, initials: true } },
      votes: { where: { userId: session.id } },
    },
  })

  return Response.json(updated)
}
