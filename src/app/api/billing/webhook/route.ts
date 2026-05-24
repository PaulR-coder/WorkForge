import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { emailSubscriptionConfirmation } from '@/lib/email'
import type Stripe from 'stripe'
import { apiError } from '@/lib/apiError'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://getworkforge.com').trim()

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch {
    return apiError('Invalid signature', 400)
  }

  async function syncSubscription(sub: Stripe.Subscription) {
    const tenantId = sub.metadata?.tenantId
    if (!tenantId) return

    // Verify the tenant exists and the Stripe customer matches before updating
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, stripeCustomerId: true } })
    if (!tenant) return
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
    if (tenant.stripeCustomerId && tenant.stripeCustomerId !== customerId) return

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        stripeCustomerId: customerId ?? undefined,
        stripeSubscriptionId: sub.id,
        subscriptionStatus: sub.status,
        currentPeriodEnd: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000),
      },
    })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription' || !session.subscription) break
      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      await syncSubscription(sub)

      // Send subscription confirmation email to the admin who subscribed
      const tenantId = sub.metadata?.tenantId
      if (tenantId) {
        const admin = await prisma.user.findFirst({
          where: { tenantId, role: 'admin', active: true },
          select: { email: true, name: true, company: true },
        })
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
        if (admin) {
          const renewDate = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000)
            .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          void emailSubscriptionConfirmation(
            admin.email,
            admin.name,
            tenant?.name ?? admin.company,
            renewDate,
            `${APP_URL}/billing`,
          )
        }
      }
      break
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.created':
      await syncSubscription(event.data.object as Stripe.Subscription)
      break
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const tenantId = sub.metadata?.tenantId
      if (tenantId) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { subscriptionStatus: 'cancelled', stripeSubscriptionId: null, currentPeriodEnd: null },
        })
      }
      break
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice
      const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id
      if (customerId) {
        await prisma.tenant.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: 'past_due' },
        })
      }
      break
    }
  }

  return Response.json({ received: true })
}

// Stripe needs the raw body — disable Next.js body parsing
export const config = { api: { bodyParser: false } }
