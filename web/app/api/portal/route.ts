import { NextResponse, type NextRequest } from 'next/server'
import { assertRateLimit } from '@/lib/rate-limit'
import { getUserFromRequest } from '@/lib/auth/user-from-request'
import { ensureStripeCustomer } from '@/lib/subscriptions'
import { getStripeClient } from '@/lib/stripe'
import { env } from '@/lib/env'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    assertRateLimit(`portal:${user.id}`, 5, 60_000)

    const subscriptionRow = await ensureStripeCustomer(user.id, user.email)
    const stripe = getStripeClient()

    const session = await stripe.billingPortal.sessions.create({
      customer: subscriptionRow.stripe_customer_id,
      return_url: `${env.siteUrl}/account`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to create portal session' }, { status: 400 })
  }
}


