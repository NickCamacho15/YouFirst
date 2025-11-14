import HeroSection from '@/components/landing/HeroSection'
import FeatureSection from '@/components/landing/FeatureSection'
import JourneySection from '@/components/landing/JourneySection'
import CTASection from '@/components/landing/CTASection'

export default function HomePage() {
  return (
    <main className="shell">
      <HeroSection />
      <FeatureSection />
      <JourneySection />
      <CTASection />
    </main>
  )
}

