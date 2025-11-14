export type PlanId = 'monthly' | 'yearly'

export type PlanDefinition = {
  id: PlanId
  name: string
  tagline: string
  priceDisplay: string
  cadence: string
  blurb: string
  featured?: boolean
  gradientFrom: string
  gradientTo: string
  features: string[]
  ctaLabel: string
}

export const PRICING_PLANS: PlanDefinition[] = [
  {
    id: 'monthly',
    name: 'Momentum Monthly',
    tagline: 'Start your mastery journey',
    priceDisplay: '$49',
    cadence: 'per month',
    blurb: 'All premium routines, guided accountability, and priority support.',
    gradientFrom: '#8E2DE2',
    gradientTo: '#4A00E0',
    features: ['Unlimited disciplines & routines', 'Weekly mastery recaps', 'Premium content drops', 'Cancel anytime'],
    ctaLabel: 'Start Monthly Plan',
  },
  {
    id: 'yearly',
    name: 'Legendary Annual',
    tagline: 'Two months free',
    priceDisplay: '$499',
    cadence: 'per year',
    blurb: 'Commit to the year, unlock VIP intensives and seasonal labs.',
    featured: true,
    gradientFrom: '#F7971E',
    gradientTo: '#FFD200',
    features: ['Everything in Monthly', 'Quarterly mastery intensives', 'VIP office hours', 'Priority feature requests'],
    ctaLabel: 'Upgrade & Save',
  },
]

export function getPlanCopy(id: PlanId): PlanDefinition {
  const plan = PRICING_PLANS.find((p) => p.id === id)
  if (!plan) {
    throw new Error(`Unknown plan: ${id}`)
  }
  return plan
}


