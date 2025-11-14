'use client'

import { useState } from 'react'
import SignUpForm from './SignUpForm'
import SignInForm from './SignInForm'

export default function AuthExperience() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')

  return (
    <section className="section-card" style={{ padding: '3rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        <span className="gradient-pill">Account access</span>
        <h1 style={{ margin: 0, fontSize: '3rem' }}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Web-only registration keeps Apple apps compliant. After sign-up you&apos;ll be routed to pricing to activate your plan.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          className={`btn ${mode === 'signup' ? 'btn-primary' : 'btn-ghost'}`}
          type="button"
          onClick={() => setMode('signup')}
        >
          Sign up
        </button>
        <button
          className={`btn ${mode === 'signin' ? 'btn-primary' : 'btn-ghost'}`}
          type="button"
          onClick={() => setMode('signin')}
        >
          Sign in
        </button>
      </div>

      <div className="auth-grid">
        {mode === 'signup' ? <SignUpForm switchToSignIn={() => setMode('signin')} /> : <SignInForm switchToSignUp={() => setMode('signup')} />}
        <aside className="glass-panel" style={{ minHeight: '100%' }}>
          <h3 style={{ marginTop: 0 }}>Mobile policy</h3>
          <ul style={{ lineHeight: 1.6, color: 'var(--text-muted)', paddingLeft: '1.2rem' }}>
            <li>iOS + Android apps stay sign-in only.</li>
            <li>No in-app links to payment (Apple safe).</li>
            <li>Stripe customer portal handles upgrades/cancellations.</li>
            <li>Supabase entitlements unlock premium instantly after payment.</li>
          </ul>
        </aside>
      </div>
    </section>
  )
}


