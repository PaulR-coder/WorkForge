import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageSettings')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!session.tenantId) return Response.json({ error: 'No tenant' }, { status: 403 })

  const { id } = await params

  // Verify ownership before deleting
  const connection = await prisma.socialConnection.findUnique({ where: { id } })
  if (!connection || connection.tenantId !== session.tenantId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.socialConnection.delete({ where: { id } })
  return Response.json({ ok: true })
}
