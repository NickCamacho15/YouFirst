import AccountDashboard from '@/components/account/AccountDashboard'

export default function AccountPage() {
  return (
    <main className="shell">
      <section className="section-card" style={{ padding: '3rem' }}>
        <span className="gradient-pill">Subscription</span>
        <h1 style={{ fontSize: '3rem', margin: '1rem 0' }}>Manage your membership</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: 560 }}>
          Access Stripe&apos;s customer portal, review renewal dates, or cancel anytime. Mobile apps read the same Supabase
          entitlements you see here.
        </p>
        <div className="divider" />
        <AccountDashboard />
      </section>
    </main>
  )
}


