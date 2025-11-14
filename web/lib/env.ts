const requiredPublic = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SITE_URL'] as const
const requiredServer = ['SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] as const

function getEnvValue(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const publicEnv = {
  supabaseUrl: getEnvValue('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: getEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  siteUrl: getEnvValue('NEXT_PUBLIC_SITE_URL').replace(/\/$/, ''),
} as const

export const env = {
  ...publicEnv,
  supabaseServiceRoleKey: getEnvValue('SUPABASE_SERVICE_ROLE_KEY'),
  stripeSecretKey: getEnvValue('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: getEnvValue('STRIPE_WEBHOOK_SECRET'),
  stripePriceMonthlyId: process.env.STRIPE_PRICE_MONTHLY_ID || '',
  stripePriceYearlyId: process.env.STRIPE_PRICE_YEARLY_ID || '',
} as const

export function validateEnv(): void {
  requiredPublic.forEach((key) => getEnvValue(key))
  requiredServer.forEach((key) => getEnvValue(key))
  if (!env.stripePriceMonthlyId || !env.stripePriceYearlyId) {
    console.warn('Stripe price IDs missing. Set STRIPE_PRICE_MONTHLY_ID and STRIPE_PRICE_YEARLY_ID.')
  }
}


