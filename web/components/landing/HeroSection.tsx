'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

const stats = [
  { label: 'Training areas', value: '4 Core' },
  { label: 'Tracking features', value: '15+' },
  { label: 'All-in-one platform', value: 'Mind + Body + Goals' },
]

export default function HeroSection() {
  return (
    <section className="hero-shell">
      <motion.div
        className="hero-logo"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <Image 
          src="/youlogo.png" 
          alt="You logo" 
          width={96} 
          height={96} 
          priority 
          style={{ objectFit: 'contain' }}
        />
        <span>.uoY</span>
      </motion.div>
      <p className="hero-tagline">YouFirst · Personal Excellence OS</p>
      <motion.h1
        className="hero-title"
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        Your Complete Personal Mastery System
      </motion.h1>
      <p className="hero-subtitle">
        Track your workouts, build unbreakable discipline, master your mind through reading and meditation, 
        achieve your goals, and quantify the true cost of distractions. All in one powerful mobile app.
      </p>
      <div className="hero-cta-row">
        <Link href="/auth" className="btn btn-primary btn-large">
          Start Your Journey
        </Link>
        <Link href="/pricing" className="btn btn-ghost btn-large">
          View Pricing
        </Link>
        <span className="hero-disclaimer">One-time payment · Instant mobile access</span>
      </div>
      <div className="hero-metrics">
        {stats.map((stat) => (
          <div key={stat.label} className="hero-metric">
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}


