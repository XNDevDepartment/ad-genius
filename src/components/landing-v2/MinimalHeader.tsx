import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logoHorizontal from "@/assets/logos/logo_horizontal.png";

export const MinimalHeader = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

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

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/signin')}
          >
            {t('landingV2.header.signIn', 'Sign In')}
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
