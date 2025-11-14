import { env } from '@/lib/env'
import { PRICING_PLANS, type PlanId } from '@/lib/pricing/data'

type ServerPlanConfig = {
  planId: PlanId
  stripePriceId: string
  priceLabel: string
}

const priceIdMap: Record<PlanId, ServerPlanConfig> = {
  monthly: {
    planId: 'monthly',
    stripePriceId: env.stripePriceMonthlyId,
    priceLabel: PRICING_PLANS.find((p) => p.id === 'monthly')!.priceDisplay,
  },
  yearly: {
    planId: 'yearly',
    stripePriceId: env.stripePriceYearlyId,
    priceLabel: PRICING_PLANS.find((p) => p.id === 'yearly')!.priceDisplay,
  },
}

export function getStripePriceConfig(planId: PlanId): ServerPlanConfig {
  const config = priceIdMap[planId]
  if (!config || !config.stripePriceId) {
    throw new Error(`Stripe price not configured for ${planId}`)
  }
  return config
}

export function getPlanIdFromStripePrice(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null
  const entry = Object.entries(priceIdMap).find(([, cfg]) => cfg.stripePriceId === priceId)
  return (entry?.[0] as PlanId) ?? null
}


