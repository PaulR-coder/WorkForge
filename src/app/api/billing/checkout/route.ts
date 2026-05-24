import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe, PLANS } from '@/lib/stripe'
import { apiError } from '@/lib/apiError'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://getworkforge.com').trim()

export async function POST() {
  const session = await getSession()
  if (!session || !['admin', 'superadmin'].includes(session.role)) {
    return apiError('Unauthorized', 401)
  }
  if (!session.tenantId) return apiError('No tenant context — impersonate a tenant first', 400)

  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant) return apiError('Tenant not found', 404)

  if (!PLANS.pro.priceId) {
    return apiError('Stripe price not configured', 500)
  }

  // Create or reuse Stripe customer
  let customerId = tenant.stripeCustomerId ?? undefined
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.email,
      name: tenant.name,
      metadata: { tenantId: tenant.id },
    })
    customerId = customer.id
    await prisma.tenant.update({ where: { id: tenant.id }, data: { stripeCustomerId: customerId } })
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: PLANS.pro.priceId, quantity: 1 }],
    success_url: `${APP_URL}/billing?success=1`,
    cancel_url: `${APP_URL}/billing`,
    subscription_data: {
      metadata: { tenantId: tenant.id },
    },
    allow_promotion_codes: true,
  })

  return Response.json({ url: checkoutSession.url })
}
