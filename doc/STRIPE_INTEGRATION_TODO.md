## Values to Replace

The following values are placeholders and must be updated before going live.

**Files containing placeholders:**
- [src/app/api/payments/checkout/route.ts](src/app/api/payments/checkout/route.ts)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| mode | subscription | Set to "payment" for one-time charges or "subscription" for recurring billing. |
| success_url | http://localhost:3000/dashboard/settings?session_id={CHECKOUT_SESSION_ID}&success=true | Your actual post-payment success page URL. Keep the {CHECKOUT_SESSION_ID} template. |
| cancel_url | http://localhost:3000/dashboard/settings?canceled=true | Your actual cancel/return page URL. |
| line_items[].price | price_... | Your actual Stripe Price ID from the Dashboard (https://dashboard.stripe.com/prices) or API. |

---

## Configured Parameters

These parameters were configured in Checkout Studio and are already set correctly.

**Files containing these parameters:**
- [src/app/api/payments/checkout/route.ts](src/app/api/payments/checkout/route.ts)

| Parameter | Value |
|-----------|-------|
| ui_mode | hosted_page |
| billing_address_collection | auto |
| phone_number_collection | { "enabled": false } |
| automatic_tax | { "enabled": false } |
| allow_promotion_codes | false |
| payment_method_collection | always (when mode is subscription) |
| submit_type | auto |
| integration_identifier | hosted_web_0001 |
| origin_context | web |

---

## Setup and Next Steps

### Environment Variables & Keys
Add the following keys to your [.env.local](file:///d:/Seventh%20Semester/PROJECTS/FYP/.env.local) file:

```env
# Stripe Keys (Get from Stripe Dashboard -> https://dashboard.stripe.com/test/apikeys)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Webhook Secret (Get from Stripe Dashboard -> https://dashboard.stripe.com/workbench/webhooks)
STRIPE_WEBHOOK_SECRET=whsec_...

# Domain URL of your web app
DOMAIN=http://localhost:3000
```

### Project Structure Created
- [`src/lib/stripe.ts`](file:///d:/Seventh%20Semester/PROJECTS/FYP/src/lib/stripe.ts): Stripe Node SDK initialization helper.
- [`src/app/api/payments/checkout/route.ts`](file:///d:/Seventh%20Semester/PROJECTS/FYP/src/app/api/payments/checkout/route.ts): API route that handles creating Stripe Hosted Checkout Sessions.

### How the Integration Works
1. Client makes a `POST` request to `/api/payments/checkout`.
2. Server calls `stripe.checkout.sessions.create()` configured with hosted page mode and parameters.
3. Server returns `{ url: session.url }`, and client redirects user to Stripe hosted checkout page.
4. After payment completion, Stripe redirects back to `success_url`.

### Testing Credit Card Numbers
Use Stripe test card numbers (e.g. `4242 4242 4242 4242`) in test mode.

### Resources
- [Stripe Documentation](https://docs.stripe.com)
- [Stripe Support](https://support.stripe.com)
