import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const estimate = await prisma.estimate.findFirst({
    where: { approvalToken: token },
    select: {
      id: true, number: true, client: true, jobType: true,
      description: true, lineItems: true, subtotal: true,
      status: true, approvalTokenExpiry: true,
      createdBy: { select: { company: true } },
    },
  })

  if (!estimate) return Response.json({ error: 'Invalid or expired link' }, { status: 404 })
  if (estimate.approvalTokenExpiry && new Date() > estimate.approvalTokenExpiry) {
    return Response.json({ error: 'This estimate link has expired' }, { status: 410 })
  }

  return Response.json(estimate)
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { action } = await req.json()

  if (action !== 'approve' && action !== 'decline') {
    return Response.json({ error: 'Invalid action' }, { status: 400 })
  }

  const estimate = await prisma.estimate.findFirst({
    where: { approvalToken: token },
    include: { createdBy: { select: { tenantId: true } } },
  })

  if (!estimate) return Response.json({ error: 'Invalid link' }, { status: 404 })
  if (estimate.approvalTokenExpiry && new Date() > estimate.approvalTokenExpiry) {
    return Response.json({ error: 'This link has expired' }, { status: 410 })
  }
  if (estimate.status === 'approved') {
    return Response.json({ status: 'approved', alreadyDone: true })
  }
  if (estimate.status === 'declined') {
    return Response.json({ status: 'declined', alreadyDone: true })
  }

  if (action === 'approve') {
    // Auto-create a job from the estimate
    const job = await prisma.job.create({
      data: {
        client: estimate.client,
        address: '',
        type: estimate.jobType || 'Service',
        description: estimate.description,
        priority: 'normal',
        status: 'open',
        tenantId: estimate.tenantId,
      },
    })

    await prisma.estimate.update({
      where: { id: estimate.id },
      data: { status: 'approved', jobId: job.id },
    })

    void prisma.auditLog.create({
      data: {
        icon: '✅', action: 'Estimate approved by client', severity: 'info',
        detail: `${estimate.number} — job ${job.id} created`,
        tenantId: estimate.tenantId,
      },
    }).catch(() => {})

    return Response.json({ status: 'approved', jobId: job.id })
  }

  // Decline
  await prisma.estimate.update({
    where: { id: estimate.id },
    data: { status: 'declined' },
  })

  return Response.json({ status: 'declined' })
}
