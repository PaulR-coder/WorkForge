import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getTenantFilter } from '@/lib/tenant'
import ContractsClient from './ContractsClient'

export default async function ContractsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const tenantFilter = getTenantFilter(session)
  const contracts = await prisma.contract.findMany({ where: tenantFilter, orderBy: { nextDueDate: 'asc' } })

  return (
    <ContractsClient
      initialContracts={contracts.map(c => ({
        ...c,
        nextDueDate: c.nextDueDate.toISOString(),
      }))}
      canEdit={can(session.role, 'editContracts')}
    />
  )
}
