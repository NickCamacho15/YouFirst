"use client"

export default function Home() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
        Habit Tracker Web
      </h1>
      <p style={{ color: "#555", lineHeight: 1.6 }}>
        This is a clean Next.js web app separated under <code>/web</code>.
        It has its own dependencies and does not import React Native modules.
      </p>
    </main>
  )
}

