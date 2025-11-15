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
    name: 'Monthly Membership',
    tagline: 'Full access to all features',
    priceDisplay: '$49',
    cadence: 'per month',
    blurb: 'Complete personal mastery system with all tracking features unlocked.',
    gradientFrom: '#8E2DE2',
    gradientTo: '#4A00E0',
    features: [
      'Complete Workout Tracking System',
      'Guided Meditation Timer',
      'Reading Session Logging',
      'Goal & Achievement Tracking',
      '40-100 Day Challenges',
      'Personal Records & Body Metrics',
      'Distraction Analytics',
      'Unlimited Streak Tracking',
      'Visual Progress Charts',
      'Cancel anytime'
    ],
    ctaLabel: 'Start Monthly Plan',
  },
  {
    id: 'yearly',
    name: 'Annual Membership',
    tagline: 'Save over $90 per year',
    priceDisplay: '$499',
    cadence: 'per year',
    blurb: 'Best value - commit to a full year of personal transformation.',
    featured: true,
    gradientFrom: '#F7971E',
    gradientTo: '#FFD200',
    features: [
      'Everything in Monthly',
      'Two months FREE',
      'Priority support',
      'Early access to new features',
      'Lifetime achievement archive',
      'Advanced analytics dashboard',
    ],
    ctaLabel: 'Save with Annual',
  },
]

export function getPlanCopy(id: PlanId): PlanDefinition {
  const plan = PRICING_PLANS.find((p) => p.id === id)
  if (!plan) {
    throw new Error(`Unknown plan: ${id}`)
  }
  return plan
}


