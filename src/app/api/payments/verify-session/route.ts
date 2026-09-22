import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/mongo/mongo'
import { stripe } from '@/lib/stripe'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'

export async function POST(req: NextRequest) {
  try {
    const token = await getSessionTokenFromCookies()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyJwt(token)
    const body = await req.json().catch(() => ({}))
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Verify session status with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === 'paid' || session.status === 'complete') {
      const db = await getDb()
      const users = db.collection('users')
      const oneMonthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await users.updateOne(
        { _id: new ObjectId(payload.sub) as any },
        {
          $set: {
            subscriptionStatus: 'active',
            subscriptionPlan: 'pro',
            subscriptionEndsAt: oneMonthFromNow,
            stripeCustomerId: session.customer as string || undefined,
            stripeSubscriptionId: session.subscription as string || undefined,
            updatedAt: new Date(),
          },
        }
      )

      return NextResponse.json({
        success: true,
        message: 'Payment verified! Your account has been upgraded to Pro for 30 days.',
      })
    } else {
      return NextResponse.json({ error: 'Payment incomplete or pending' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Verify checkout session error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
