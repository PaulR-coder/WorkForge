import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { apiError } from '@/lib/apiError'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://getworkforge.com').trim()

export async function POST() {
  const session = await getSession()
  if (!session || !['admin', 'superadmin'].includes(session.role)) {
    return apiError('Unauthorized', 401)
  }
  if (!session.tenantId) return apiError('No tenant context — impersonate a tenant first', 400)

  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant?.stripeCustomerId) {
    return apiError('No billing account', 404)
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${APP_URL}/billing`,
  })

  return Response.json({ url: portalSession.url })
}
