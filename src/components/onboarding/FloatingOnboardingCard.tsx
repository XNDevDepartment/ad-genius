import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, ChevronUp, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useOnboardingMilestones } from "@/hooks/useOnboardingMilestones";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { Progress } from "@/components/ui/progress";

export const FloatingOnboardingCard = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { completed, loading, refetch } = useOnboarding();
  const { completedCount, totalCreditsEarned } = useOnboardingMilestones();

  const [isCollapsed, setIsCollapsed] = useState(() => 
    localStorage.getItem('onboarding_card_collapsed') === 'true'
  );

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('onboarding_card_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Don't render on mobile or if onboarding is complete
  if (isMobile || completed || loading) return null;

  const progressPercent = (completedCount / 4) * 100;

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden lg:block">
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <button
              onClick={() => setIsCollapsed(false)}
              className="flex items-center gap-3 bg-gradient-hero text-primary-foreground px-4 py-3 rounded-xl shadow-apple-lg hover:shadow-apple-xl transition-all duration-200 hover:scale-[1.02]"
            >
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                <span className="font-medium text-sm">
                  {t('onboarding.checklist.title', 'Getting Started')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs opacity-80">{completedCount}/4</span>
                <ChevronUp className="h-4 w-4 opacity-70" />
              </div>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-[380px] max-h-[calc(100vh-120px)] overflow-auto"
          >
            <div className="relative">
              {/* Collapse button overlay */}
              <button
                onClick={() => setIsCollapsed(true)}
                className="absolute top-3 right-12 z-10 p-1.5 rounded-lg text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 transition-colors"
                aria-label="Collapse"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              
              <OnboardingChecklist onComplete={refetch} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingOnboardingCard;
