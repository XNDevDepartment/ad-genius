import { useRef, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCredits } from "@/hooks/useCredits";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";

interface PostGenerationUpgradeModalProps {
  jobStatus: string | undefined;
  jobId: string | undefined;
}

export const PostGenerationUpgradeModal = ({ jobStatus, jobId }: PostGenerationUpgradeModalProps) => {
  const [open, setOpen] = useState(false);
  const shownForJobRef = useRef<string | null>(null);
  const { isFreeTier } = useCredits();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (
      jobStatus === "completed" &&
      jobId &&
      shownForJobRef.current !== jobId &&
      isFreeTier() &&
      isMobile
    ) {
      shownForJobRef.current = jobId;
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [jobStatus, jobId, isFreeTier, isMobile]);

  if (!isMobile || !isFreeTier()) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {t('mobileUpgrade.postGeneration.title')}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {t('mobileUpgrade.postGeneration.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button
            size="lg"
            className="w-full font-bold h-14 text-base"
            onClick={() => {
              setOpen(false);
              navigate("/promo/3meses");
            }}
          >
            {t('mobileUpgrade.postGeneration.upgradeCta')}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            {t('mobileUpgrade.postGeneration.continueFree')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
