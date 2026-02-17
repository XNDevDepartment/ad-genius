import { useState } from "react";
import { useCredits } from "@/hooks/useCredits";
import { useUserStats } from "@/hooks/useUserStats";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export const StickyUpgradeBar = () => {
  const [dismissed, setDismissed] = useState(false);
  const { isFreeTier, getRemainingCredits, getTotalCredits } = useCredits();
  const { stats } = useUserStats();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (!isMobile) return null;
  if (dismissed) return null;
  if (!isFreeTier()) return null;
  if (stats.totalImages < 1) return null;

  const remaining = getRemainingCredits();
  const total = getTotalCredits();
  if (total === 0 || remaining / total >= 0.5) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            You're generating results. Ready to scale?
          </p>
        </div>
        <Button
          size="sm"
          className="flex-shrink-0 font-bold text-xs"
          onClick={() => navigate("/pricing")}
        >
          Unlock 200 credits — €49
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
