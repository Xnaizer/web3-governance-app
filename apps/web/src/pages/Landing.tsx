import { SmoothScroll } from "../providers/SmoothScroll";
import { LandingNav } from "../components/landing/LandingNav";
import { LandingHero } from "../components/landing/LandingHero";
import { HeroShowcase } from "../components/landing/HeroShowcase";
import { FeatureShowcase } from "../components/landing/FeatureShowcase";
import { StickyInfo } from "../components/landing/StickyInfo";
import { ProgramFlow } from "../components/landing/ProgramFlow";
import { HoverFeature } from "../components/landing/HoverFeature";
import { StatsCards } from "../components/landing/StatsCards";
import { FrequentlyAskQuestion } from "../components/landing/FrequentlyAskQuestion";
import { LandingFooter } from "../components/landing/LandingFooter";
import { TechStack } from "@/components/TechStack";

export function Landing() {
  return (
    <SmoothScroll>
      <div className="bg-background">
        <LandingNav />
        <main>
          <LandingHero />
          <TechStack />
          <HeroShowcase />
          <FeatureShowcase />
          <StickyInfo />
          <ProgramFlow />
          <HoverFeature />
          <StatsCards />
          <FrequentlyAskQuestion />
          <LandingFooter />
        </main>
      </div>
    </SmoothScroll>
  );
}
