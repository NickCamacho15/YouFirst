import crypto from 'node:crypto'
import type Stripe from 'stripe'
import { getServiceSupabaseClient } from '@/lib/supabase/service'
import { getStripeClient } from '@/lib/stripe'
import type { PlanId } from '@/lib/pricing/data'
import { getPlanIdFromStripePrice } from '@/lib/pricing/server'
import type { Tables } from '@/types/database'

export async function getSubscriptionsRow(userId: string): Promise<Tables<'subscriptions'> | null> {
  const supabase = getServiceSupabaseClient()
  const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function ensureStripeCustomer(userId: string, email: string | null): Promise<Tables<'subscriptions'>> {
  const supabase = getServiceSupabaseClient()
  const existing = await getSubscriptionsRow(userId)
  if (existing?.stripe_customer_id) {
    return existing
  }
  const stripe = getStripeClient()
  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: {
      supabaseUserId: userId,
    },
  })
  const { data, error } = await (supabase
    .from('subscriptions') as any)
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: customer.id,
        plan_id: existing?.plan_id ?? 'pending',
        price_id: existing?.price_id ?? 'pending',
        status: existing?.status ?? 'incomplete',
        stripe_subscription_id: existing?.stripe_subscription_id ?? null,
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .maybeSingle()
  if (error || !data) {
    throw new Error(error?.message || 'Failed to upsert subscription stub')
  }
  return data
}

export type SubscriptionStatusPayload = {
  userId?: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  planId?: PlanId | 'pending' | null
  priceId?: string | null
  status: Tables<'subscriptions'>['status']
  currentPeriodEnd?: number | null
  cancelAtPeriodEnd?: boolean | null
}

export async function upsertSubscriptionStatus(payload: SubscriptionStatusPayload): Promise<void> {
  const supabase = getServiceSupabaseClient()
  const { userId, stripeCustomerId, stripeSubscriptionId, planId, priceId, status, currentPeriodEnd, cancelAtPeriodEnd } =
    payload

  if (!userId && !stripeCustomerId) {
    throw new Error('Missing identifiers for subscription update')
  }

  let matchQuery = supabase.from('subscriptions').select('*').limit(1)
  if (userId) {
    matchQuery = matchQuery.eq('user_id', userId)
  } else if (stripeCustomerId) {
    matchQuery = matchQuery.eq('stripe_customer_id', stripeCustomerId)
  }
  const { data: existingRaw, error: selectError } = await matchQuery.maybeSingle()
  if (selectError) {
    throw new Error(selectError.message)
  }

  const existing = existingRaw as Tables<'subscriptions'> | null

  const targetUserId = userId || existing?.user_id
  if (!targetUserId) {
    console.warn('Skipping subscription update; no matching user for payload', {
      stripeCustomerId,
      stripeSubscriptionId,
      status,
    })
    return
  }

  const resolvedPlan =
    planId ||
    getPlanIdFromStripePrice(priceId ?? existing?.price_id ?? null) ||
    (existing?.plan_id as PlanId | 'pending' | null) ||
    'pending'

  const updatePayload: Tables<'subscriptions'> = {
    id: existing?.id ?? crypto.randomUUID(),
    user_id: targetUserId,
    stripe_customer_id: stripeCustomerId || existing?.stripe_customer_id || '',
    stripe_subscription_id: stripeSubscriptionId || existing?.stripe_subscription_id || null,
    plan_id: resolvedPlan || 'pending',
    price_id: priceId || existing?.price_id || 'pending',
    status,
    current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : existing?.current_period_end ?? null,
    cancel_at_period_end: cancelAtPeriodEnd ?? existing?.cancel_at_period_end ?? false,
    created_at: existing?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { error: upsertError } = await (supabase.from('subscriptions') as any).upsert(updatePayload, {
    onConflict: 'id',
  })
  if (upsertError) {
    throw new Error(upsertError.message)
  }
}

export function extractSubscriptionPayload(
  event: Stripe.Event,
): SubscriptionStatusPayload | null {
  if (event.type.startsWith('customer.subscription.')) {
    const subscription = event.data.object as Stripe.Subscription
    const primaryItem = subscription.items.data[0]
    return {
      // Prefer explicit metadata set from our app; ignore other Stripe internals for type safety
      userId: (subscription.metadata?.supabaseUserId as string | undefined) ?? null,
      stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      stripeSubscriptionId: subscription.id,
      priceId: primaryItem?.price?.id ?? null,
      status: subscription.status as SubscriptionStatusPayload['status'],
      // Stripe v19+ exposes current period timestamps on SubscriptionItem, not Subscription itself
      currentPeriodEnd: primaryItem?.current_period_end ?? null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    }
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    return {
      userId: (session.metadata?.supabaseUserId as string | undefined) ?? session.client_reference_id,
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
      stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
      priceId: session.metadata?.priceId ?? null,
      planId: (session.metadata?.planId as PlanId | undefined) ?? null,
      status: 'active',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    }
  }
  if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    // Stripe's webhook payload includes a top-level `subscription` on invoices that
    // is not currently modeled on the TypeScript `Invoice` type, so we access it via a cast.
    const rawInvoice = event.data.object as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription
    }

    const subscriptionId =
      typeof rawInvoice.subscription === 'string' ? rawInvoice.subscription : null

    return {
      userId: invoice.metadata?.supabaseUserId ?? null,
      stripeCustomerId: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null,
      stripeSubscriptionId: subscriptionId,
      // Newer InvoiceLineItem typings expose `pricing.price_details.price` instead of a direct `price` object
      priceId: invoice.lines.data[0]?.pricing?.price_details?.price ?? null,
      status: event.type === 'invoice.payment_succeeded' ? 'active' : 'past_due',
      currentPeriodEnd: invoice.lines.data[0]?.period?.end ?? null,
      cancelAtPeriodEnd: undefined,
    }
  }
  return null
}


