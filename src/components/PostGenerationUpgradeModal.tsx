import { useRef, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCredits } from "@/hooks/useCredits";
import { useIsMobile } from "@/hooks/use-mobile";

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

  useEffect(() => {
    if (
      jobStatus === "completed" &&
      jobId &&
      shownForJobRef.current !== jobId &&
      isFreeTier() &&
      isMobile
    ) {
      shownForJobRef.current = jobId;
      // Small delay so user sees their result first
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
            This image was created with the Free plan.
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            With Plus, you can generate 200 images this month.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button
            size="lg"
            className="w-full font-bold h-14 text-base"
            onClick={() => {
              setOpen(false);
              navigate("/pricing");
            }}
          >
            Upgrade and Scale My Store
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            Continue with Free
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
