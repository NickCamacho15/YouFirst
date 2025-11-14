import Link from 'next/link'

export default function CTASection() {
  return (
    <section className="section-card" style={{ padding: '3rem', textAlign: 'center' }}>
      <span className="gradient-pill">Ready?</span>
      <h2 style={{ fontSize: '2.8rem', marginBottom: '0.75rem' }}>Launch web-first memberships today</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: 560, margin: '0 auto 2rem' }}>
        Supabase stores entitlements, Stripe owns payments, and your mobile app stays compliant while unlocking premium
        cohorts instantly.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/auth" className="btn btn-primary">
          Create Account
        </Link>
        <Link href="/account" className="btn btn-ghost">
          Manage Subscription
        </Link>
      </div>
    </section>
  )
}


