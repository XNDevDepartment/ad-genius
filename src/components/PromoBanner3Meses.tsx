import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";

const PromoBanner3Meses = () => {
  const { user } = useAuth();
  const { tier } = useCredits();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("promo_3meses_banner_dismissed") === "true"
  );

  if (!user || tier !== "Free" || dismissed || isMobile) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("promo_3meses_banner_dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="relative bg-gradient-to-r from-primary via-purple-600 to-pink-600 text-white px-4 py-2.5 text-center text-sm font-medium">
      <div className="flex items-center justify-center gap-2 pr-8">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>{t('promo.banner3Meses.message')}</span>
        <Link
          to="/promo/3meses"
          className="inline-flex items-center rounded-full bg-white/20 hover:bg-white/30 px-3 py-0.5 text-xs font-semibold transition-colors"
        >
          {t('promo.banner3Meses.cta')}
        </Link>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
        aria-label={t('promo.banner3Meses.close')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default PromoBanner3Meses;
