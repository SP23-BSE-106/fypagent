import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'

export async function POST() {
  try {
    const token = await getSessionTokenFromCookies()
    let userEmail: string | undefined = undefined
    let userId: string | undefined = undefined

    if (token) {
      try {
        const payload = verifyJwt(token)
        userEmail = payload.email
        userId = payload.sub
      } catch {
        // Continue if no valid session
      }
    }

    const domain = process.env.DOMAIN || 'http://localhost:3000'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      ui_mode: 'hosted_page',
      billing_address_collection: 'auto',
      phone_number_collection: {
        enabled: false,
      },
      automatic_tax: {
        enabled: false,
      },
      allow_promotion_codes: false,
      submit_type: 'auto',
      integration_identifier: 'hosted_web_0001',
      origin_context: 'web',
      mode: 'subscription',
      customer_email: userEmail || undefined,
      metadata: {
        userId: userId || '',
        userEmail: userEmail || '',
      },
      success_url: `${domain}/dashboard/payment?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${domain}/dashboard/payment?canceled=true`,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'AgentFlow Pro Subscription',
              description: 'Access to all agent canvas workflows, execution nodes, and templates.',
            },
            unit_amount: 1900, // $19.00 USD
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
    }

    sessionParams.payment_method_collection = 'always'

    const session = await getStripe().checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: unknown) {
    console.error('Error creating Stripe checkout session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
