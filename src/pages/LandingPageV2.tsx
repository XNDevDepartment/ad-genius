import { useEffect } from "react";
import { MinimalHeader } from "@/components/landing-v2/MinimalHeader";
import { MinimalHero } from "@/components/landing-v2/MinimalHero";
import { LogoMarquee } from "@/components/landing-v2/LogoMarquee";
import { ImageMarquee } from "@/components/landing-v2/ImageMarquee";
import { StatsGrid } from "@/components/landing-v2/StatsGrid";
import { BeforeAfterShowcase } from "@/components/landing-v2/BeforeAfterShowcase";
import { HowItWorksMinimal } from "@/components/landing-v2/HowItWorksMinimal";
import { PricingComparison } from "@/components/landing-v2/PricingComparison";
import { FAQAccordion } from "@/components/landing-v2/FAQAccordion";
import { MinimalFooter } from "@/components/landing-v2/MinimalFooter";
import { trackViewContent } from "@/lib/metaPixel";

const LandingPageV2 = () => {
  useEffect(() => {
    trackViewContent('Landing Page V2');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <MinimalHeader />
      
      {/* Add padding for fixed header */}
      <main className="pt-16">
        <MinimalHero />
        <LogoMarquee />
        <ImageMarquee />
        <StatsGrid />
        <BeforeAfterShowcase />
        <section id="how-it-works">
          <HowItWorksMinimal />
        </section>
        <section id="pricing">
          <PricingComparison />
        </section>
        <section id="faq">
          <FAQAccordion />
        </section>
      </main>

      <MinimalFooter />
    </div>
  );
};

export default LandingPageV2;
