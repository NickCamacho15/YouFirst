const steps = [
  { id: 'S1', title: 'Supabase client for web', detail: 'Browser + server helpers wired to env-safe configs.' },
  { id: 'S4', title: 'Subscriptions schema', detail: 'RLS policies, entitlements view, webhook idempotency.' },
  { id: 'S6', title: 'Stripe Checkout', detail: 'Hosted flow with plan map + metadata for Supabase.' },
  { id: 'S7', title: 'Webhook brain', detail: 'Status upserts, retries, and Stripe event audit trail.' },
  { id: 'S9', title: 'Mobile unlock', detail: 'Sign-in only app reads entitlements and gates premium.' },
]

export default function JourneySection() {
  return (
    <section className="section-card" style={{ padding: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem' }}>
        <div style={{ maxWidth: 520 }}>
          <span className="gradient-pill">Roadmap</span>
          <h2 style={{ fontSize: '2.4rem', margin: '1rem 0' }}>Step-by-step delivery</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Mirrors the implementation plan in docs/WEB-STRIPE-INTEGRATION-PLAN.json so engineering, finance, and ops all
            stay aligned.
          </p>
        </div>
        <div className="success-banner">
          <strong>Acceptance Criteria</strong>
          <ul style={{ marginTop: '0.75rem', paddingLeft: '1.2rem', lineHeight: 1.5 }}>
            <li>Web sign-up + payment succeeds end-to-end.</li>
            <li>Webhook marks Supabase active within seconds.</li>
            <li>Account portal & status surfaces in one place.</li>
            <li>Mobile unlocks premium without Apple IAP.</li>
          </ul>
        </div>
      </div>
      <div style={{ marginTop: '2.5rem', display: 'grid', gap: '1rem' }}>
        {steps.map((step) => (
          <article
            key={step.id}
            style={{
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              gap: '1.25rem',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 600,
              }}
            >
              {step.id}
            </div>
            <div>
              <h4 style={{ margin: 0 }}>{step.title}</h4>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>{step.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}


