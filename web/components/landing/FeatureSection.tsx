const features = [
  {
    title: '💪 Complete Fitness System',
    body: 'Track workouts, log personal records, monitor body metrics, and follow custom workout plans. Built-in exercise library with progressive tracking and rest timers.',
  },
  {
    title: '⛰️ Discipline Challenges',
    body: 'Create 40-100 day challenges with custom rules. Visual calendar tracking, streak monitoring, and daily completion checkboxes keep you accountable.',
  },
  {
    title: '🧠 Mind Training Suite',
    body: 'Reading sessions with reflection notes, guided meditation timer with interval chimes, and distraction tracking that quantifies the true cost of social media.',
  },
  {
    title: '🎯 Goal Achievement System',
    body: 'Set clear goals with benefits, consequences, and action steps. Track progress visually and archive your achievements with completion dates.',
  },
]

export default function FeatureSection() {
  return (
    <section className="section-card feature-section">
      <header className="section-head">
        <div>
          <span className="gradient-pill">Comprehensive Features</span>
          <h2>Everything you need for personal mastery</h2>
          <p>A complete system that tracks your physical training, mental development, goal achievement, and daily disciplines—all in one powerful mobile app.</p>
        </div>
      </header>
      <div className="feature-grid">
        {features.map((feature) => (
          <article key={feature.title} className="feature-card">
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}


