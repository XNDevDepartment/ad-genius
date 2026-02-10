import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/contexts/AuthContext";

const PROMO_START_KEY = "promo_onb1st_start";
const PROMO_DISMISSED_KEY = "promo_banner_dismissed";
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

const MobilePromoBanner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier } = useCredits();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(PROMO_DISMISSED_KEY) === "true");
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!user || tier !== "Free") return;

    let start = localStorage.getItem(PROMO_START_KEY);
    if (!start) {
      start = String(Date.now());
      localStorage.setItem(PROMO_START_KEY, start);
    }

    const updateRemaining = () => {
      const diff = Number(start) + TWENTY_FOUR_HOURS - Date.now();
      setRemaining(diff);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [user, tier]);

  if (!user || tier !== "Free" || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(PROMO_DISMISSED_KEY, "true");
    setDismissed(true);
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return null;
    const totalSec = Math.floor(ms / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const timeStr = remaining !== null ? formatTime(remaining) : null;
  const isExpired = remaining !== null && remaining <= 0;

  return (
    <div className="lg:hidden fixed bottom-20 left-3 right-3 z-40 animate-in slide-in-from-bottom-4 duration-300">
      <div className="relative bg-gradient-to-r from-primary to-purple-600 rounded-2xl p-3 shadow-lg">
        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/70 hover:text-white p-0.5"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 pr-6">
          <div className="flex-shrink-0 bg-white/20 rounded-xl p-2">
            <Zap className="h-5 w-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            {isExpired ? (
              <p className="text-white text-sm font-semibold">
                {t("promo.mobile.upgradeFrom")} €19.99{t("promo.mobile.perMonth")}
              </p>
            ) : (
              <>
                <p className="text-white text-sm font-semibold truncate">
                  {t("promo.mobile.starterOffer")} — €19.99/{t("promo.mobile.firstMonth")}
                </p>
                {timeStr && (
                  <p className="text-white/80 text-xs font-mono mt-0.5">
                    ⏱ {timeStr} {t("promo.mobile.timeLeft")}
                  </p>
                )}
              </>
            )}
          </div>

          <Button
            size="sm"
            onClick={() => navigate("/promo/first-month")}
            className="flex-shrink-0 bg-white text-primary hover:bg-white/90 text-xs font-bold px-3 h-8 rounded-xl shadow-none"
          >
            {t("promo.mobile.getOffer")}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobilePromoBanner;
