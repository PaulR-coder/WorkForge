import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { can } from '@/lib/permissions'
import { getTenantFilter } from '@/lib/tenant'
import InvoicesClient from './InvoicesClient'

export default async function InvoicesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'viewFinancials')) redirect('/jobs')

  const tenantFilter = getTenantFilter(session)
  const invoices = await prisma.invoice.findMany({
    where: tenantFilter,
    include: { job: { select: { client: true, type: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const serialized = invoices.map(i => ({
    ...i,
    dueDate: i.dueDate.toISOString(),
    paidAt: i.paidAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }))

  return <InvoicesClient initialInvoices={serialized} session={session} />
}
