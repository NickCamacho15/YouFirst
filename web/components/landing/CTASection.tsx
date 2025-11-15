import Link from 'next/link'
import Image from 'next/image'

export default function CTASection() {
  return (
    <section className="section-card" style={{ padding: '3rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
        <Image src="/youlogo.png" alt="YouFirst logo" width={48} height={48} />
        <span className="gradient-pill">Ready to Transform?</span>
      </div>
      <h2 style={{ fontSize: '2.8rem', marginBottom: '0.75rem' }}>Start Your Personal Mastery Journey</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: 560, margin: '0 auto 2rem' }}>
        Get instant access to the complete mobile app. Track workouts, build discipline, master your mind, 
        achieve your goals, and measure every aspect of your personal growth.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/auth" className="btn btn-primary">
          Get Started Now
        </Link>
        <Link href="/account" className="btn btn-ghost">
          Manage Account
        </Link>
      </div>
    </section>
  )
}


