import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { env } from '@/lib/env'
import { getStripeClient } from '@/lib/stripe'
import { getServiceSupabaseClient } from '@/lib/supabase/service'
import { extractSubscriptionPayload, upsertSubscriptionStatus } from '@/lib/subscriptions'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  const rawBody = await request.text()
  const stripe = getStripeClient()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature || '', env.stripeWebhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const supabase = getServiceSupabaseClient()
  const serializedEvent = JSON.parse(JSON.stringify(event))

  const { error: insertError } = await (supabase.from('stripe_events') as any).insert({
    id: event.id,
    type: event.type,
    payload: serializedEvent,
  })

  if (insertError && insertError.code === '23505') {
    return NextResponse.json({ received: true })
  }

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const payload = extractSubscriptionPayload(event)
  if (payload) {
    await upsertSubscriptionStatus(payload)
  }

  return NextResponse.json({ received: true })
}


