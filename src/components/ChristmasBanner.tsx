import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, TreePine, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

const ChristmasBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if banner was dismissed
    const isDismissed = localStorage.getItem("christmas-banner-dismissed");
    
    // Check if promo is still valid (until Dec 31, 2025)
    const promoEndDate = new Date('2025-12-31T23:59:59');
    const isPromoValid = new Date() <= promoEndDate;
    
    if (!isDismissed && isPromoValid) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("christmas-banner-dismissed", "true");
  };

  const handleCTA = () => {
    navigate("/natal");
    handleDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="relative bg-gradient-to-r from-red-600 via-red-500 to-green-600 text-white py-2.5 px-4 z-50">
      <div className="container mx-auto flex items-center justify-center gap-3 text-sm">
        {/* Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <TreePine className="h-4 w-4 animate-pulse" />
          <span className="font-medium">
            🎄 Promoção de Natal! <strong>€19.99/mês</strong> durante 12 meses
          </span>
          <span className="text-white/80">— Poupa 31%</span>
          <Button
            onClick={handleCTA}
            size="sm"
            variant="secondary"
            className="ml-2 h-7 px-3 bg-white text-red-600 hover:bg-white/90 font-semibold"
          >
            <Gift className="h-3.5 w-3.5 mr-1.5" />
            Ver Oferta
          </Button>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <TreePine className="h-4 w-4 animate-pulse" />
          <span className="font-medium text-xs">
            Natal! <strong>€19.99/mês</strong> 🎄
          </span>
          <Button
            onClick={handleCTA}
            size="sm"
            variant="secondary"
            className="h-6 px-2 text-xs bg-white text-red-600 hover:bg-white/90 font-semibold"
          >
            Ver
          </Button>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Fechar banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ChristmasBanner;
