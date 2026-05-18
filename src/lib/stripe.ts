import Stripe from 'stripe'

let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(key, { apiVersion: '2026-04-22.dahlia' })
  }
  return _stripe
}

// Keep named export for backwards compat — lazily resolved
export const stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    return (getStripe() as unknown as Record<string, unknown>)[prop as string]
  },
})

export const PLANS = {
  pro: {
    name: 'WorkForge Pro',
    basePrice: 39,
    perUserPrice: 12,
    priceId: process.env.STRIPE_PRICE_ID ?? '',
    features: [
      '$39/mo base + $12/user/mo',
      'Unlimited jobs & work orders',
      'Push notifications',
      'Invoicing & payments',
      'Equipment tracking',
      'Service contracts',
      'Audit log',
    ],
  },
}
