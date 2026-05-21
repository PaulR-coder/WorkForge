import { prisma } from '@/lib/prisma'
import ApprovalClient from './ApprovalClient'

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
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Link not found</h1>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>This estimate link is invalid or has already been used. Please contact the company directly.</p>
        </div>
      </div>
    )
  }

  if (estimate.approvalTokenExpiry && new Date() > estimate.approvalTokenExpiry) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Link expired</h1>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>This estimate link has expired. Please contact the company to request a new one.</p>
        </div>
      </div>
    )
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
