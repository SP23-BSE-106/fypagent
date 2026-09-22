import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/mongo/mongo'
import { stripe } from '@/lib/stripe'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'

export async function POST(req: NextRequest) {
  const bodyText = await req.text()
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: any

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(bodyText, sig, webhookSecret)
    } else {
      event = JSON.parse(bodyText)
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const db = await getDb()
  const users = db.collection('users')

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const customerEmail = session.customer_details?.email || session.customer_email || session.metadata?.userEmail
    const userId = session.metadata?.userId

    const oneMonthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    let updateQuery: any = {
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
        await users.updateOne({ _id: new ObjectId(userId) as any }, updateQuery)
      } catch (err) {
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
