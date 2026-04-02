import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AffiliateHero } from '@/components/affiliate/AffiliateHero';
import { AffiliateHowItWorks } from '@/components/affiliate/AffiliateHowItWorks';
import { AffiliateCommissionDetails } from '@/components/affiliate/AffiliateCommissionDetails';
import { AffiliateTargetAudience } from '@/components/affiliate/AffiliateTargetAudience';
import { AffiliateRules } from '@/components/affiliate/AffiliateRules';
import { AffiliateApplicationForm } from '@/components/affiliate/AffiliateApplicationForm';
import { MinimalHeader } from '@/components/landing-v2/MinimalHeader';
import { MinimalFooter } from '@/components/landing-v2/MinimalFooter';
import { useTranslation } from 'react-i18next';
import SEO from '@/components/SEO';
import { buildOrganizationSchema } from '@/lib/schema';
import { PageTransition } from '@/components/PageTransition';

const AffiliateLanding = () => {
  const { t } = useTranslation();
  const formRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <SEO
        title="Affiliate Program - Earn 15% Commission"
        description="Join the ProduktPix affiliate program and earn 15% recurring commission for 12 months. Promote AI product photography to your audience and start earning passive income."
        path="/afiliados"
        schema={[buildOrganizationSchema()]}
      />
      <MinimalHeader />
      
      <main className="pt-20">
        <AffiliateHero 
          onApplyClick={scrollToForm}
          onHowItWorksClick={scrollToHowItWorks}
        />
        
        <div ref={howItWorksRef}>
          <AffiliateHowItWorks />
        </div>
        
        <AffiliateCommissionDetails />
        
        <AffiliateTargetAudience />
        
        <AffiliateRules />
        
        {/* Final CTA before form */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">
              {t('affiliate.ctaSection.title')}
            </h2>
            <Button 
              size="lg" 
              onClick={scrollToForm}
              className="bg-gradient-button text-primary-foreground"
            >
              {t('affiliate.ctaSection.cta')}
            </Button>
          </div>
        </section>
        
        <div ref={formRef}>
          <AffiliateApplicationForm />
        </div>
      </main>
      
      <MinimalFooter />
    </div>
    </PageTransition>
  );
};

export default AffiliateLanding;
