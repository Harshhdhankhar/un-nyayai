import { LandingNav } from "@/components/landing/landing-nav";
import { HeroSection } from "@/components/landing/hero-section";
import { MarqueeTicker } from "@/components/landing/marquee-ticker";
import { SourcesTicker } from "@/components/landing/sources-ticker";
import { InteractiveShowcase } from "@/components/landing/interactive-showcase";
import { LegalAnatomySection } from "@/components/landing/legal-anatomy-section";
import { ScenariosSection } from "@/components/landing/scenarios-section";
import { ProblemSection } from "@/components/landing/problem-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { PrivacySection } from "@/components/landing/privacy-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FooterSection } from "@/components/landing/footer-section";

export default function HomePage() {
  return (
    <div className="min-h-svh bg-[#fbfaf7] text-foreground selection:bg-border">
      <LandingNav />
      <main id="top">
        <HeroSection />
        <MarqueeTicker />
        <SourcesTicker />
        <InteractiveShowcase />
        <LegalAnatomySection />
        <ScenariosSection />
        <ProblemSection />
        <FeaturesSection />
        <PrivacySection />
        <HowItWorksSection />
        <FaqSection />
      </main>
      <FooterSection />
    </div>
  );
}
