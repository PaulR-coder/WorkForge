import { prisma } from '@/lib/prisma'
import ApprovalClient, { NotFoundPage, ExpiredPage } from './ApprovalClient'

export default async function ApprovePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ action?: string }>
}) {
  const { token } = await params
  const { action } = await searchParams

  const estimate = await prisma.estimate.findFirst({
    where: { approvalToken: token },
    select: {
      id: true, number: true, client: true, jobType: true,
      description: true, lineItems: true, subtotal: true,
      status: true, approvalTokenExpiry: true,
      createdBy: { select: { company: true } },
    },
  })

  if (!estimate) {
    return <NotFoundPage />
  }

  if (estimate.approvalTokenExpiry && new Date() > estimate.approvalTokenExpiry) {
    return <ExpiredPage />
  }

  const initialAction = action === 'approve' ? 'approve' : action === 'decline' ? 'decline' : undefined

  return (
    <ApprovalClient
      token={token}
      estimate={{
        ...estimate,
        lineItems: (estimate.lineItems as any[]) ?? [],
        createdBy: { company: estimate.createdBy?.company ?? '' },
      }}
      initialAction={initialAction}
    />
  )
}
