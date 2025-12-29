import { Button } from '@/components/ui/button';
import { ArrowDown, Gift } from 'lucide-react';

interface AffiliateHeroProps {
  onApplyClick: () => void;
  onHowItWorksClick: () => void;
}

export const AffiliateHero = ({ onApplyClick, onHowItWorksClick }: AffiliateHeroProps) => {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-hero opacity-5" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8">
            <Gift className="w-4 h-4" />
            <span className="text-sm font-medium">Programa de Afiliados</span>
          </div>
          
          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Ganha comissões recorrentes ao recomendar o{' '}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              ProduktPix
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto">
            Recebe <strong className="text-foreground">25% de comissão recorrente</strong> por cada cliente ativo que indiques — durante 12 meses.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={onApplyClick}
              className="bg-gradient-button text-primary-foreground text-lg px-8 py-6"
            >
              Candidatar-me ao programa
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={onHowItWorksClick}
              className="text-lg px-8 py-6"
            >
              Ver como funciona
              <ArrowDown className="ml-2 w-4 h-4" />
            </Button>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Pagamentos mensais</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Sem custos de adesão</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Dashboard completo</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
