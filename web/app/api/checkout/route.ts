import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { assertRateLimit } from '@/lib/rate-limit'
import { getUserFromRequest } from '@/lib/auth/user-from-request'
import { ensureStripeCustomer } from '@/lib/subscriptions'
import { getStripeClient } from '@/lib/stripe'
import { getStripePriceConfig } from '@/lib/pricing/server'
import type { PlanId } from '@/lib/pricing/data'
import { env } from '@/lib/env'

const payloadSchema = z.object({
  priceId: z.enum(['monthly', 'yearly']),
  mode: z.literal('subscription'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const payload = payloadSchema.parse(body)
    const planId = payload.priceId as PlanId

    assertRateLimit(`checkout:${user.id}`, 5, 60_000)

    const subscriptionRow = await ensureStripeCustomer(user.id, user.email ?? null)
    const stripe = getStripeClient()
    const priceConfig = getStripePriceConfig(planId)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: subscriptionRow.stripe_customer_id,
      success_url: `${env.siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      line_items: [
        {
          price: priceConfig.stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        supabaseUserId: user.id,
        planId,
        priceId: priceConfig.stripePriceId,
      },
      subscription_data: {
        metadata: {
          supabaseUserId: user.id,
          planId,
        },
      },
      client_reference_id: user.id,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to create checkout session' }, { status: 400 })
  }
}


