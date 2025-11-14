import StatusPoller from '@/components/success/StatusPoller'

export default function SuccessPage() {
  return (
    <main className="shell">
      <section className="section-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <span className="gradient-pill">Payment received</span>
        <h1 style={{ fontSize: '3rem', margin: '1rem 0' }}>Setting everything up…</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: 560, margin: '0 auto' }}>
          Stripe just confirmed your subscription. We&apos;re syncing entitlements to Supabase so the mobile app unlocks
          premium modes. Keep this tab open for a few seconds.
        </p>
        <StatusPoller />
        <div className="divider" />
        <div className="account-status">
          <div className="status-tile">
            <h4>Next steps</h4>
            <p style={{ color: 'var(--text-muted)' }}>Sign into the iOS app with the same email to access everything.</p>
          </div>
          <div className="status-tile">
            <h4>Need to manage billing?</h4>
            <p style={{ color: 'var(--text-muted)' }}>Visit the Account page anytime to open the Stripe billing portal.</p>
          </div>
        </div>
      </section>
    </main>
  )
}


