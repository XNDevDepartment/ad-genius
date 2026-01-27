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
  ChevronDown,
  Crown,
  Loader2,
  Zap
} from "lucide-react";
import { useOnboardingMilestones } from "@/hooks/useOnboardingMilestones";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OnboardingChecklistProps {
  onComplete?: () => void;
  onCollapse?: () => void;
}

export const OnboardingChecklist = ({ onComplete, onCollapse }: OnboardingChecklistProps) => {
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
  const { user, subscriptionData, loading: authLoading } = useAuth();
  const [awarding, setAwarding] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Check if all credits have been awarded
  const allCreditsAwarded = 
    milestones.ugc.credited && 
    milestones.video.credited && 
    milestones.outfit_swap.credited && 
    milestones.all_complete.credited;

  const subscriptionTier = subscriptionData?.subscription_tier || 'Free';

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

  // Auto-complete onboarding only when all milestones are credited AND user is NOT on Free tier
  // (Free tier users should see the offer card first)
  useEffect(() => {
    if (allCreditsAwarded && subscriptionTier !== 'Free') {
      completeOnboarding();
      onComplete?.();
    }
  }, [allCreditsAwarded, subscriptionTier, completeOnboarding, onComplete]);

  const handleSkip = async () => {
    await completeOnboarding();
    onComplete?.();
  };

  const handleGetOffer = async () => {
    if (authLoading) {
      toast.error(t('onboarding.offer.pleaseWait', 'Please wait...'));
      return;
    }
    
    if (!user) {
      toast.error(t('onboarding.offer.authRequired', 'Please sign in to continue'));
      return;
    }
    
    setIsCheckingOut(true);
    try {
      console.log('[OnboardingChecklist] Starting checkout:', {
        planId: 'starter',
        interval: 'month',
        promoCode: 'ONB1ST',
        userId: user.id
      });

      const { data: checkoutData, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          planId: 'starter',
          interval: 'month',
          promoCode: 'ONB1ST'
        }
      });

      if (error) {
        console.error('[OnboardingChecklist] Checkout error:', error);
        throw new Error(error.message || 'Checkout failed');
      }
      
      if (!checkoutData?.url) {
        throw new Error('No checkout URL received');
      }

      // Redirect to Stripe checkout
      window.location.href = checkoutData.url;
    } catch (error: any) {
      console.error('[OnboardingChecklist] Checkout error:', error);
      toast.error(t('onboarding.offer.checkoutError', 'Unable to start checkout. Please try again.'));
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleStartFree = async () => {
    await completeOnboarding();
    onComplete?.();
    navigate('/create');
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
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "font-medium text-sm line-clamp-2",
              state.credited ? "text-primary" : "text-foreground"
            )}>
              {title}
            </h4>
            <div className="flex-shrink-0">
              {state.credited && (
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                  +5 ✓
                </span>
              )}
              {!state.credited && !isLocked && (
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  +5
                </span>
              )}
            </div>
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
          <div className="flex items-center gap-1">
            {onCollapse && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onCollapse}
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
          </div>
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

        {/* Offer Teaser - show when not all complete */}
        {!allCreditsAwarded && (
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
            <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t('onboarding.checklist.offerTeaser', 'Complete all tasks to unlock a special first-month offer!')}
            </p>
          </div>
        )}

        {/* Promotional Offer - show when all complete and user is on Free tier */}
        {allCreditsAwarded && subscriptionTier === 'Free' && (
          <Card className="p-4 border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{t('onboarding.checklist.offerCard.title', 'First month only €19.99')}</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold">€19.99</span>
                  <span className="text-sm text-muted-foreground line-through">
                    {t('onboarding.checklist.offerCard.regularPrice', '€29')}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full font-medium">
                    {t('onboarding.checklist.offerCard.badge', 'Save €10!')}
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGetOffer}
              disabled={isCheckingOut}
              className="w-full mt-4"
              size="lg"
            >
              {isCheckingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('onboarding.checklist.offerCard.cta', 'Get This Offer')
              )}
            </Button>

            <Button
              onClick={handleStartFree}
              variant="ghost"
              className="w-full mt-2 text-muted-foreground"
            >
              {t('onboarding.checklist.offerCard.skipCta', 'Start Creating (Free)')}
            </Button>
          </Card>
        )}

        {/* Skip link - only show when not all complete or not on free tier */}
        {(!allCreditsAwarded || subscriptionTier !== 'Free') && (
          <div className="pt-2 text-center">
            <button 
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              {t('onboarding.checklist.skip', 'Skip and explore freely')}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OnboardingChecklist;
