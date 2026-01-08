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
import SEO from "@/components/SEO";
import { buildWebApplicationSchema, buildHowToSchema, buildFAQPageSchema } from "@/lib/schema";

const LandingPageV2 = () => {
  useEffect(() => {
    trackViewContent('Landing Page V2');
  }, []);

  const howToSchema = buildHowToSchema(
    'Create AI Product Photos',
    'Generate professional product images in 3 simple steps',
    [
      { name: 'Upload', text: 'Upload your product photo or packshot' },
      { name: 'Choose', text: 'Select a scene or AI model for your product' },
      { name: 'Generate', text: 'Click generate and download your new images' },
    ]
  );

  const faqSchema = buildFAQPageSchema([
    { question: 'What is ProduktPix?', answer: 'ProduktPix is an AI-powered platform for creating professional product photos, virtual try-ons, and video ads.' },
    { question: 'How many images can I create?', answer: 'It depends on your plan. Starter includes 100 credits/month, Plus 250, and Pro 500 credits.' },
    { question: 'Can I use the images commercially?', answer: 'Yes, all generated images include full commercial rights for your business use.' },
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="AI Product Photos for E-commerce"
        description="Transform your product photos with AI. Generate professional lifestyle images, virtual try-ons, and video ads in seconds. Used by 10,000+ brands worldwide."
        path="/lp"
        schema={[buildWebApplicationSchema(), howToSchema, faqSchema]}
      />
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
