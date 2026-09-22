import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is missing from environment variables.')
}

// Initializing Stripe client without explicit apiVersion per guidelines
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
