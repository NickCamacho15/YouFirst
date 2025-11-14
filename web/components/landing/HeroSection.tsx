'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const copy = {
  title: 'Premium mastery without app store friction.',
  subtitle:
    'Create your account on the web, power it with Stripe, and unlock the entire mobile experience through Supabase entitlements.',
  metrics: [
    { label: 'Avg. weekly streak', value: '47 days' },
    { label: 'Guided disciplines', value: '150+' },
    { label: 'Coaching cohorts', value: '24' },
  ],
}

export default function HeroSection() {
  return (
    <section className="section-card hero-grid" style={{ padding: '3rem', position: 'relative' }}>
      <div className="grid-overlay" />
      <motion.div
        className="orb"
        style={{ top: '-120px', right: '-90px' }}
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div
        className="orb orb--pink"
        style={{ bottom: '-140px', left: '-60px' }}
        animate={{ opacity: [0.6, 0.2, 0.6] }}
        transition={{ duration: 14, repeat: Infinity }}
      />

      <div style={{ maxWidth: 640, position: 'relative' }}>
        <span className="gradient-pill">Stripe + Supabase secured</span>
        <motion.h1
          style={{ fontSize: 'clamp(2.8rem, 5vw, 4rem)', margin: '1.5rem 0 1rem', lineHeight: 1.1 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {copy.title}
        </motion.h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', lineHeight: 1.7 }}>
          {copy.subtitle}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem' }}>
          <Link href="/auth" className="btn btn-primary">
            Create Account
          </Link>
          <Link href="/pricing" className="btn btn-ghost">
            See Plans
          </Link>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
          {copy.metrics.map((metric) => (
            <div key={metric.label} className="status-tile" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <p style={{ fontSize: '2rem', fontWeight: 600 }}>{metric.value}</p>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>{metric.label}</p>
            </div>
          ))}
        </div>
      </div>

      <motion.div
        style={{
          marginLeft: 'auto',
          borderRadius: 28,
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '2rem',
          width: '100%',
          maxWidth: 380,
          background: 'rgba(5,6,12,0.75)',
          backdropFilter: 'blur(18px)',
        }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.15 }}
      >
        <h3 style={{ marginTop: 0, fontSize: '1.15rem' }}>How it works</h3>
        <ol style={{ color: 'var(--text-muted)', lineHeight: 1.6, paddingLeft: '1.2rem' }}>
          <li>Register on the web and auto-create your Stripe customer.</li>
          <li>Pick a plan, finish payment via hosted Checkout.</li>
          <li>Sign into the mobile app — entitlements unlock instantly.</li>
        </ol>
        <div className="divider" />
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
          Apple compliant. No in-app purchase steering — mobile stays sign-in only.
        </p>
      </motion.div>
    </section>
  )
}


