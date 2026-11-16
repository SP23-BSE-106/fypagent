import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/mongo/mongo'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const bodyText = await req.text()
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret || !sig) {
    console.error('Webhook rejected: missing signing secret or Stripe signature')
    return NextResponse.json(
      { error: 'Webhook signature verification required' },
      { status: 400 },
    )
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(bodyText, sig, webhookSecret)
  } catch (error: unknown) {
    console.error(
      'Webhook signature verification failed:',
      error instanceof Error ? error.message : 'Invalid webhook payload',
    )
    return NextResponse.json(
      { error: 'Invalid webhook signature or payload' },
      { status: 400 },
    )
  }

  const db = await getDb()
  const users = db.collection('users')

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const customerEmail = session.customer_details?.email || session.customer_email || session.metadata?.userEmail
    const userId = session.metadata?.userId

    const oneMonthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const updateQuery = {
      $set: {
        subscriptionStatus: 'active',
        subscriptionPlan: 'pro',
        subscriptionEndsAt: oneMonthFromNow,
        stripeCustomerId: session.customer || undefined,
        stripeSubscriptionId: session.subscription || undefined,
        updatedAt: new Date(),
      },
    }

    if (userId) {
      try {
        await users.updateOne({ _id: new ObjectId(userId) }, updateQuery)
      } catch {
        if (customerEmail) {
          await users.updateOne({ email: customerEmail.toLowerCase() }, updateQuery)
        }
      }
    } else if (customerEmail) {
      await users.updateOne({ email: customerEmail.toLowerCase() }, updateQuery)
    }
  }

  return NextResponse.json({ received: true })
}
