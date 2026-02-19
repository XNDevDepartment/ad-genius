import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const MinimalHero = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center px-4 py-20">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          {t('landingV2.hero.badge', 'AI-Powered Product Photography')}
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
          <span className="text-foreground">{t('landingV2.hero.title1', 'Professional Product Photos')}</span>
          <br />
          <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
            {t('landingV2.hero.title2', 'Without the Studio')}
          </span>
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          {t('landingV2.hero.description', 'Save thousands on photography. Get studio-quality product images from a simple phone photo — ready in seconds, not days.')}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
            onClick={() => navigate('/signup')}
          >
            {t('landingV2.hero.cta', 'Start Creating Free')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-lg px-8 py-6 rounded-full"
            onClick={() => window.open('https://cal.com/produktpix/demo', '_blank')}
          >
            <Calendar className="mr-2 h-5 w-5" />
            {t('landingV2.hero.bookDemo', 'Book a Demo')}
          </Button>
        </div>

        {/* Trust line */}
        <p className="text-sm text-muted-foreground">
          {t('landingV2.hero.trustLine', 'Trusted by 10,000+ e-commerce businesses worldwide')}
        </p>
      </div>
    </section>
  );
};
