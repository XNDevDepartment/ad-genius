import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  // TEMPORARILY DISABLED: Mobile onboarding is deactivated
  // Remove this early return to re-enable mobile onboarding
  return <>{children}</>;

  // Original logic below (kept for easy re-activation)
  const { completed, loading } = useOnboarding();
  const isMobile = useIsMobile();

  // Only show onboarding on mobile devices
  if (!isMobile) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!completed) {
    return <OnboardingWizard />;
  }

  return <>{children}</>;
};
