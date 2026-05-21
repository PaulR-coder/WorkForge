import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'
import EstimatesClient from './EstimatesClient'

export default async function EstimatesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'createEstimate')) redirect('/jobs')

  const db = tenantPrisma(session)
  const tenantFilter = getTenantFilter(session)

  const estimates = await db.estimate.findMany({
    where: tenantFilter,
    include: { createdBy: { select: { name: true, initials: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <EstimatesClient session={session} initialEstimates={estimates as any} />
}
