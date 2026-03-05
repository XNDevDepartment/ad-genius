import { useEffect } from "react";
import { MinimalHeader } from "@/components/landing-v2/MinimalHeader";
import { MinimalHero } from "@/components/landing-v2/MinimalHero";
import { LogoMarquee } from "@/components/landing-v2/LogoMarquee";
import { ValuePropsSection } from "@/components/landing-v2/ValuePropsSection";
import { ProductPhotographyExplainer } from "@/components/landing-v2/ProductPhotographyExplainer";
import { BeforeAfterShowcase } from "@/components/landing-v2/BeforeAfterShowcase";
import { ComparisonTable } from "@/components/landing-v2/ComparisonTable";
import { UseCasesGrid } from "@/components/landing-v2/UseCasesGrid";
import { ImageMarquee } from "@/components/landing-v2/ImageMarquee";
import { TestimonialsSection } from "@/components/landing-v2/TestimonialsSection";
import { HowItWorksMinimal } from "@/components/landing-v2/HowItWorksMinimal";
import { PricingComparison } from "@/components/landing-v2/PricingComparison";
import { FAQAccordion } from "@/components/landing-v2/FAQAccordion";
import { MinimalFooter } from "@/components/landing-v2/MinimalFooter";
import { trackViewContent } from "@/lib/metaPixel";
import SEO from "@/components/SEO";
import { buildWebApplicationSchema, buildSoftwareAppWithReviewsSchema, buildHowToSchema, buildFAQPageSchema } from "@/lib/schema";

const LandingPageV2 = () => {
  useEffect(() => {
    trackViewContent('Landing Page V2');
  }, []);

  const howToSchema = buildHowToSchema(
    'Create Professional Product Photos',
    'Get studio-quality product images in 3 simple steps',
    [
      { name: 'Upload', text: 'Upload your product photo — even from your phone' },
      { name: 'Choose', text: 'Select a scene or background for your product' },
      { name: 'Generate', text: 'Click generate and download your professional images' },
    ]
  );

  const faqSchema = buildFAQPageSchema([
    { question: 'What is ProduktPix?', answer: 'ProduktPix is a platform for creating professional product photos, virtual try-ons, and video ads for e-commerce businesses.' },
    { question: 'How many images can I create?', answer: 'It depends on your plan. Starter includes 100 credits/month, Plus 250, and Pro 500 credits.' },
    { question: 'Can I use the images commercially?', answer: 'Yes, all generated images include full commercial rights for your business use.' },
    { question: 'How much does professional product photography cost?', answer: 'Traditional studios charge €15–50 per image. With ProduktPix, professional product photos start from €0.20 per image.' },
    { question: 'Do I need a studio for professional product photos?', answer: 'No. Upload a phone photo and get studio-quality results in under 30 seconds.' },
    { question: 'What makes a good product photo for Shopify or Amazon?', answer: 'Consistent lighting, clean backgrounds, multiple angles, and lifestyle context. ProduktPix generates all of these automatically.' },
    { question: 'Can I create professional photos with my phone?', answer: 'Yes! Upload any phone photo and ProduktPix transforms it into a professional product image.' },
    { question: 'What is the best tool for professional product photos?', answer: 'ProduktPix is purpose-built for e-commerce product photography with studio-quality backgrounds, lifestyle scenes, and batch processing.' },
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Professional Product Photos — Studio-Quality Images for Your Online Store"
        description="Professional product photography made simple for e-commerce. Upload your product, choose a scene, get store-ready images in seconds. From €0.20 per image."
        path="/"
        schema={[buildWebApplicationSchema(), buildSoftwareAppWithReviewsSchema(), howToSchema, faqSchema]}
      />
      <MinimalHeader />
      {/* Add padding for fixed header */}
      <main className="pt-16">
        <MinimalHero />
        <UseCasesGrid />
        <LogoMarquee />
        <ValuePropsSection />
        <ProductPhotographyExplainer />
        <BeforeAfterShowcase />
        <ComparisonTable />
        <ImageMarquee />
        <TestimonialsSection />
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
