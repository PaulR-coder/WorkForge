import { randomBytes } from 'crypto'
import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { tenantPrisma } from '@/lib/prisma'
import { getTenantFilter } from '@/lib/tenant'
import { emailEstimate } from '@/lib/email'
import { apiError } from '@/lib/apiError'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://getworkforge.com').trim()

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)
  if (!can(session.role, 'createEstimate')) return apiError('Forbidden', 403)
  const db = tenantPrisma(session)

  const { id } = await params
  const tenantFilter = getTenantFilter(session)
  const estimate = await db.estimate.findFirst({ where: { id, ...tenantFilter } })
  if (!estimate) return apiError('Not found', 404)

  if (!estimate.clientEmail?.trim()) {
    return apiError('Client email is required to send the estimate', 400)
  }
  if (estimate.status === 'approved' || estimate.status === 'declined') {
    return apiError('Cannot resend a closed estimate', 400)
  }

  const token = randomBytes(32).toString('hex')
  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await db.estimate.update({
    where: { id },
    data: { approvalToken: token, approvalTokenExpiry: expiry, status: 'sent' },
  })

  const tenant = await db.tenant.findFirst({ where: { id: session.tenantId ?? '' } })
  const companyName = tenant?.name ?? session.company ?? 'WorkForge'

  const lineItems = Array.isArray(estimate.lineItems) ? estimate.lineItems as any[] : []

  void emailEstimate(
    estimate.clientEmail,
    companyName,
    {
      number: estimate.number,
      client: estimate.client,
      jobType: estimate.jobType,
      description: estimate.description,
      lineItems,
      subtotal: estimate.subtotal,
    },
    `${APP_URL}/approve/${token}`,
  )

  void db.auditLog.create({
    data: {
      icon: '📝', action: 'Estimate sent', severity: 'info',
      detail: `${estimate.number} → ${estimate.clientEmail}`,
      userId: session.id, tenantId: session.tenantId,
    },
  })

  return Response.json({ ok: true, token })
}
