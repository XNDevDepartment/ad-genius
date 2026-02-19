import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogIn } from "lucide-react";
import logoHorizontal from "@/assets/logos/logo_horizontal.png";

export const MinimalHeader = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center">
          <img 
            src={logoHorizontal} 
            alt="ProduktPix" 
            className="h-8 w-auto"
          />
        </button>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => scrollToSection('how-it-works')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('landingV2.header.howItWorks', 'How It Works')}
          </button>
          <button 
            onClick={() => scrollToSection('pricing')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('landingV2.header.pricing', 'Pricing')}
          </button>
          <button 
            onClick={() => scrollToSection('faq')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('landingV2.header.faq', 'FAQ')}
          </button>
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-2">
          <Button 
            size="sm"
            variant="outline"
            onClick={() => navigate('/signin')}
          >
            <LogIn className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">{t('common.signIn', 'Sign In')}</span>
          </Button>
          <Button 
            size="sm"
            onClick={() => navigate('/signup')}
          >
            {t('landingV2.header.getStarted', 'Get Started')}
          </Button>
        </div>
      </div>
    </header>
  );
};
