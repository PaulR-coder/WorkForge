import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://getworkforge.com').trim()

export async function POST() {
  const session = await getSession()
  if (!session || !['admin', 'superadmin'].includes(session.role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!session.tenantId) return Response.json({ error: 'No tenant context — impersonate a tenant first' }, { status: 400 })

  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } })
  if (!tenant?.stripeCustomerId) {
    return Response.json({ error: 'No billing account' }, { status: 404 })
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${APP_URL}/billing`,
  })

  return Response.json({ url: portalSession.url })
}
