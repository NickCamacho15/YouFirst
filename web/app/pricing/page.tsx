import CheckoutButton from '@/components/pricing/CheckoutButton'
import { PRICING_PLANS } from '@/lib/pricing/data'

export default function PricingPage() {
  return (
    <main className="shell">
      <section className="section-card" style={{ padding: '3rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 3rem' }}>
          <span className="gradient-pill">Plans</span>
          <h1 style={{ fontSize: '3rem', margin: '1rem 0' }}>Choose how you want to level up</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Hosted Stripe Checkout + Supabase entitlements means you can cancel or upgrade anytime and stay synced on
            mobile instantly.
          </p>
        </div>
        <div className="plan-grid">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`plan-card ${plan.featured ? 'featured' : ''}`}
              style={{
                background: `linear-gradient(160deg, ${plan.gradientFrom}20, rgba(5,6,10,0.9) 70%)`,
                borderColor: plan.featured ? 'rgba(255,255,255,0.35)' : undefined,
              }}
            >
              <div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{plan.tagline}</p>
                <h3 style={{ marginTop: 0 }}>{plan.name}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span className="plan-price">{plan.priceDisplay}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{plan.cadence}</span>
                </div>
                <p style={{ color: 'var(--text-muted)' }}>{plan.blurb}</p>
              </div>
              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <CheckoutButton planId={plan.id} label={plan.ctaLabel} />
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}


