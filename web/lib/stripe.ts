import Stripe from 'stripe'
import { env } from '@/lib/env'

let stripe: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!stripe) {
    stripe = new Stripe(env.stripeSecretKey, {
      apiVersion: '2024-06-20',
    })
  }
  return stripe
}


