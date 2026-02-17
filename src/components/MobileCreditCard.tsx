import { useCredits } from "@/hooks/useCredits";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const getUrgencyKey = (remaining: number): string => {
  if (remaining >= 7) return "mobileUpgrade.urgency.roomToTest";
  if (remaining >= 3) return "mobileUpgrade.urgency.almostOut";
  if (remaining >= 1) return "mobileUpgrade.urgency.lastImages";
  return "mobileUpgrade.urgency.locked";
};

const getProgressColor = (remaining: number, total: number): string => {
  if (total === 0) return "bg-destructive";
  const pct = (remaining / total) * 100;
  if (pct > 70) return "bg-green-500";
  if (pct > 30) return "bg-yellow-500";
  return "bg-destructive";
};

export const MobileCreditCard = () => {
  const { remainingCredits, isFreeTier, getRemainingCredits, getTotalCredits } = useCredits();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const remaining = getRemainingCredits();
  const total = getTotalCredits();
  const isLocked = remaining <= 0;

  if (!isFreeTier()) return null;

  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const colorClass = getProgressColor(remaining, total);

  return (
    <div className="lg:hidden rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{t('mobileUpgrade.freePlan')}</span>
        <span className="text-xs text-muted-foreground">
          {remaining} / {total} {t('mobileUpgrade.pricing.credits')}
        </span>
      </div>

      {/* Progress bar */}
      <Progress
        value={pct}
        className="h-3"
        indicatorClassName={colorClass}
      />

      {/* Urgency copy */}
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        {isLocked && <Lock className="h-4 w-4 text-destructive flex-shrink-0" />}
        {t(getUrgencyKey(remaining))}
      </p>

      {/* CTA */}
      <Button
        size="lg"
        className="w-full text-base font-bold h-14"
        onClick={() => navigate("/pricing")}
      >
        {t('mobileUpgrade.unlockMoreImages')}
        <ArrowRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  );
};
