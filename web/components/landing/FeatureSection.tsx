const features = [
  {
    title: 'Supabase identity',
    description: 'Single source of truth for users, usernames, and entitlements across web + mobile.',
    bullets: ['Service-role registration', 'RLS hardened tables', 'Entitlements view'],
  },
  {
    title: 'Stripe-first billing',
    description: 'Hosted Checkout + Portal keep PCI scope low and empower fast pricing experiments.',
    bullets: ['Checkout Session API', 'Billing portal in one click', 'Invoice + subscription webhooks'],
  },
  {
    title: 'Compliance ready',
    description: 'No App Store steering. Cards stay at Stripe. Entitlements replicated to mobile instantly.',
    bullets: ['Apple sign-in-only UX', 'Webhook idempotency log', '24/7 status polling hooks'],
  },
]

export default function FeatureSection() {
  return (
    <section className="section-card" style={{ padding: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <span className="gradient-pill">Architecture</span>
          <h2 style={{ fontSize: '2.4rem', marginBottom: '0.5rem', marginTop: '1rem' }}>Built for cross-platform ownership</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 560 }}>
            Web handles registration + billing. Supabase mirrors entitlements so iOS only needs sign in. Stripe stays the
            merchant of record.
          </p>
        </div>
        <ul className="tag-grid">
          <li>Supabase Auth</li>
          <li>Stripe Checkout</li>
          <li>Next.js 14</li>
          <li>Edge-safe rate limiting</li>
        </ul>
      </div>
      <div className="plan-grid" style={{ marginTop: '3rem' }}>
        {features.map((feature) => (
          <article key={feature.title} className="plan-card">
            <div>
              <h3 style={{ marginTop: 0 }}>{feature.title}</h3>
              <p style={{ color: 'var(--text-muted)' }}>{feature.description}</p>
            </div>
            <ul className="plan-features">
              {feature.bullets.map((bullet) => (
                <li key={bullet}>
                  <span>•</span>
                  {bullet}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}


