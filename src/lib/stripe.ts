import Stripe from 'stripe'

// Stripe client is created lazily, on first use, rather than at module load.
// `next build` imports this module while collecting page data, and Vercel does
// not have `.env.local`, so eager initialization crashed the deploy.
let client: Stripe | null = null

export function getStripe(): Stripe {
  if (client) return client

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is missing from environment variables. Set it in Vercel project settings.'
    )
  }

  // Initializing Stripe client without explicit apiVersion per guidelines
  client = new Stripe(key)
  return client
}
