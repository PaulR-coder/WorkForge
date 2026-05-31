import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { requireTenantId } from '@/lib/tenant'

const IMAGE_MONTHLY_LIMIT = 20

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageSettings')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const tenantId = requireTenantId(session)
  const period = new Date().toISOString().slice(0, 7)
  const db = tenantPrisma(session)

  const usage = await db.tenantTokenUsage.findUnique({
    where: { tenantId_period: { tenantId, period } },
    select: { imageGenerations: true },
  })

  return Response.json({ used: usage?.imageGenerations ?? 0, limit: IMAGE_MONTHLY_LIMIT })
}
