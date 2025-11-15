import Stripe from 'stripe'
import { env } from '@/lib/env'

let stripe: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!stripe) {
    stripe = new Stripe(env.stripeSecretKey, {
      // Use the library's latest API version type so TypeScript stays in sync
      apiVersion: '2025-10-29.clover',
    })
  }
  return stripe
}


