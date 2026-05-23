import { getSession } from '@/lib/auth'
import { tenantPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { can } from '@/lib/permissions'
import { getTenantFilter } from '@/lib/tenant'
import InvoicesClient from './InvoicesClient'

type Props = { searchParams: Promise<{ status?: string }> }

export default async function InvoicesPage({ searchParams }: Props) {
  const params = await searchParams
  const session = await getSession()
  if (!session) redirect('/login')
  if (!can(session.role, 'viewFinancials')) redirect('/jobs')

  const db = tenantPrisma(session)
  const tenantFilter = getTenantFilter(session)
  const invoices = await db.invoice.findMany({
    where: tenantFilter,
    include: {
      job: { select: { client: true, type: true, scheduledAt: true, description: true } },
      payments: { orderBy: { createdAt: 'desc' }, select: { id: true, amount: true, method: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const serialized = invoices.map(i => ({
    ...i,
    dueDate: i.dueDate.toISOString(),
    paidAt: i.paidAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
    job: i.job ? {
      ...i.job,
      scheduledAt: i.job.scheduledAt?.toISOString() ?? null,
    } : null,
    payments: i.payments.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
  }))

  return <InvoicesClient initialInvoices={serialized} session={session} initialStatusFilter={params.status} />
}
