import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import logoHorizontal from "@/assets/logos/logo_horizontal.png";

export const MinimalFooter = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <footer className="py-12 px-4 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <button onClick={() => navigate('/')} className="flex items-center">
            <img 
              src={logoHorizontal} 
              alt="ProduktPix" 
              className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity"
            />
          </button>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => navigate('/pricing')} className="hover:text-foreground transition-colors">
              {t('landingV2.footer.pricing', 'Pricing')}
            </button>
            <a href="mailto:info@produktpix.com" className="hover:text-foreground transition-colors">
              {t('landingV2.footer.contact', 'Contact')}
            </a>
            <button onClick={() => navigate('/help/faq')} className="hover:text-foreground transition-colors">
              {t('landingV2.footer.faq', 'FAQ')}
            </button>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ProduktPix
          </p>
        </div>
      </div>
    </footer>
  );
};
