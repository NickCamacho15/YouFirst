const phases = [
  { title: 'Sign up & Subscribe', body: 'Create your account on the web, choose your plan, and complete payment. Your mobile app access is activated instantly.' },
  { title: 'Set Your Foundation', body: 'Define your goals, create discipline challenges, add books to read, configure your meditation preferences, and set your personal records.' },
  { title: 'Execute Daily', body: 'Complete workouts with guided tracking, meditate with interval chimes, log reading sessions, check off challenge rules, and track your wins.' },
  { title: 'Measure Progress', body: 'View visual progress charts, streak counters, body metrics evolution, PR improvements, and comprehensive analytics across all areas of development.' },
]

export default function JourneySection() {
  return (
    <section className="section-card journey-section">
      <header className="section-head">
        <div>
          <span className="gradient-pill">How it works</span>
          <h2>Your path to personal mastery</h2>
          <p>A structured system that helps you build discipline, achieve goals, and measure real progress across mind, body, and spirit.</p>
        </div>
      </header>
      <div className="timeline">
        {phases.map((phase, idx) => (
          <article key={phase.title} className="timeline-item">
            <div className="timeline-dot">{idx + 1}</div>
            <div>
              <h4>{phase.title}</h4>
              <p>{phase.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}


