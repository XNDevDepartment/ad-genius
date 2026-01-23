import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Rocket, 
  Image, 
  Video, 
  Shirt, 
  Gift, 
  Check, 
  Lock, 
  ChevronRight,
  X
} from "lucide-react";
import { useOnboardingMilestones } from "@/hooks/useOnboardingMilestones";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OnboardingChecklistProps {
  onComplete?: () => void;
}

export const OnboardingChecklist = ({ onComplete }: OnboardingChecklistProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { 
    milestones, 
    loading, 
    completedCount, 
    totalCreditsEarned,
    awardMilestone,
    refetch 
  } = useOnboardingMilestones();
  const { completeOnboarding } = useOnboarding();
  const [awarding, setAwarding] = useState<string | null>(null);

  // Check and award milestones when component mounts or milestones change
  useEffect(() => {
    const awardPendingMilestones = async () => {
      // Award UGC milestone
      if (milestones.ugc.completed && !milestones.ugc.credited && awarding !== 'ugc') {
        setAwarding('ugc');
        const awarded = await awardMilestone('ugc');
        if (awarded) {
          toast.success(t('onboarding.checklist.milestones.ugc.credited', '+5 credits earned!'));
        }
        setAwarding(null);
        refetch();
      }

      // Award video milestone
      if (milestones.video.completed && !milestones.video.credited && awarding !== 'video') {
        setAwarding('video');
        const awarded = await awardMilestone('video');
        if (awarded) {
          toast.success(t('onboarding.checklist.milestones.video.credited', '+5 credits earned!'));
        }
        setAwarding(null);
        refetch();
      }

      // Award outfit swap milestone
      if (milestones.outfit_swap.completed && !milestones.outfit_swap.credited && awarding !== 'outfit_swap') {
        setAwarding('outfit_swap');
        const awarded = await awardMilestone('outfit_swap');
        if (awarded) {
          toast.success(t('onboarding.checklist.milestones.outfitSwap.credited', '+5 credits earned!'));
        }
        setAwarding(null);
        refetch();
      }

      // Award all complete bonus
      if (milestones.all_complete.completed && !milestones.all_complete.credited && awarding !== 'all_complete') {
        setAwarding('all_complete');
        const awarded = await awardMilestone('all_complete');
        if (awarded) {
          toast.success(t('onboarding.checklist.milestones.allComplete.credited', '+5 bonus credits earned!'));
        }
        setAwarding(null);
        refetch();
      }
    };

    if (!loading) {
      awardPendingMilestones();
    }
  }, [milestones, loading, awardMilestone, refetch, awarding, t]);

  // Auto-complete onboarding when all milestones are credited
  useEffect(() => {
    if (
      milestones.ugc.credited && 
      milestones.video.credited && 
      milestones.outfit_swap.credited && 
      milestones.all_complete.credited
    ) {
      completeOnboarding();
      onComplete?.();
    }
  }, [milestones, completeOnboarding, onComplete]);

  const handleSkip = async () => {
    await completeOnboarding();
    onComplete?.();
  };

  const progressPercent = (completedCount / 4) * 100;

  const MilestoneItem = ({ 
    milestone, 
    icon: Icon, 
    title, 
    description, 
    cta, 
    route,
    isLocked = false
  }: { 
    milestone: 'ugc' | 'video' | 'outfit_swap' | 'all_complete';
    icon: React.ElementType;
    title: string;
    description: string;
    cta?: string;
    route?: string;
    isLocked?: boolean;
  }) => {
    const state = milestones[milestone];
    const isAwarding = awarding === milestone;

    return (
      <div 
        className={cn(
          "flex items-center gap-4 p-4 rounded-lg border transition-all",
          state.credited 
            ? "bg-primary/5 border-primary/20" 
            : isLocked 
              ? "bg-muted/50 border-border opacity-60" 
              : "bg-card border-border hover:border-primary/40"
        )}
      >
        {/* Status Icon */}
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
          state.credited 
            ? "bg-primary text-primary-foreground" 
            : isLocked 
              ? "bg-muted text-muted-foreground"
              : "bg-secondary text-secondary-foreground"
        )}>
          {state.credited ? (
            <Check className="h-5 w-5" />
          ) : isLocked ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "font-medium text-sm",
              state.credited ? "text-primary" : "text-foreground"
            )}>
              {title}
            </h4>
            {state.credited && (
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                +5 ✓
              </span>
            )}
            {!state.credited && !isLocked && (
              <span className="text-xs font-medium text-muted-foreground">
                +5
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {description}
          </p>
        </div>

        {/* Action */}
        {!state.credited && !isLocked && cta && route && (
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => navigate(route)}
            disabled={isAwarding}
            className="flex-shrink-0"
          >
            {cta}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="shadow-apple">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-apple overflow-hidden">
      <CardHeader className="pb-4 bg-gradient-hero text-primary-foreground relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            <CardTitle className="text-lg">
              {t('onboarding.checklist.title', 'Getting Started')}
            </CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSkip}
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 -mr-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-primary-foreground/80 mt-1">
          {t('onboarding.checklist.subtitle', 'Earn 20 free credits')}
        </p>
        
        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-primary-foreground/70">
              {t('onboarding.checklist.progress', { completed: completedCount, total: 4 })}
            </span>
            <span className="font-medium">
              {totalCreditsEarned}/20 {t('common.credits', 'credits')}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-white/20" />
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <MilestoneItem
          milestone="ugc"
          icon={Image}
          title={t('onboarding.checklist.milestones.ugc.title', 'Create your first UGC image')}
          description={t('onboarding.checklist.milestones.ugc.description', 'Generate AI product photos')}
          cta={t('onboarding.checklist.milestones.ugc.cta', 'Create')}
          route="/create/ugc"
        />

        <MilestoneItem
          milestone="video"
          icon={Video}
          title={t('onboarding.checklist.milestones.video.title', 'Animate your first image')}
          description={t('onboarding.checklist.milestones.video.description', 'Turn static images into video')}
          cta={t('onboarding.checklist.milestones.video.cta', 'Create')}
          route="/create/video"
        />

        <MilestoneItem
          milestone="outfit_swap"
          icon={Shirt}
          title={t('onboarding.checklist.milestones.outfitSwap.title', 'Create your first Outfit Swap')}
          description={t('onboarding.checklist.milestones.outfitSwap.description', 'Try clothes on models')}
          cta={t('onboarding.checklist.milestones.outfitSwap.cta', 'Try it')}
          route="/create/outfit-swap"
        />

        <MilestoneItem
          milestone="all_complete"
          icon={Gift}
          title={t('onboarding.checklist.milestones.allComplete.title', 'Bonus: All steps completed!')}
          description={t('onboarding.checklist.milestones.allComplete.description', 'Finish all tasks to unlock')}
          isLocked={!milestones.all_complete.completed}
        />

        {/* Skip link */}
        <div className="pt-2 text-center">
          <button 
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            {t('onboarding.checklist.skip', 'Skip and explore freely')}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OnboardingChecklist;
