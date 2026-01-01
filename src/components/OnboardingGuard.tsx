import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Loader2 } from 'lucide-react';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  const { completed, loading } = useOnboarding();

  // Show loading spinner while checking onboarding status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Show onboarding wizard if not completed
  if (!completed) {
    return <OnboardingWizard />;
  }

  // User has completed onboarding, show normal content
  return <>{children}</>;
};
