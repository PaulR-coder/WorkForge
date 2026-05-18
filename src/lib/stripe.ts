import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-04-22.dahlia',
})

export const PLANS = {
  pro: {
    name: 'WorkForge Pro',
    price: 49,
    priceId: process.env.STRIPE_PRICE_ID ?? '',
    features: [
      'Unlimited jobs & work orders',
      'Unlimited technicians',
      'Push notifications',
      'Invoicing & payments',
      'Equipment tracking',
      'Service contracts',
      'Audit log',
    ],
  },
}
