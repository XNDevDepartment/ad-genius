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

const AffiliateLanding = () => {
  const formRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
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
              Pronto para começar a ganhar?
            </h2>
            <Button 
              size="lg" 
              onClick={scrollToForm}
              className="bg-gradient-button text-primary-foreground"
            >
              Candidatar-me ao programa
            </Button>
          </div>
        </section>
        
        <div ref={formRef}>
          <AffiliateApplicationForm />
        </div>
      </main>
      
      <MinimalFooter />
    </div>
  );
};

export default AffiliateLanding;
