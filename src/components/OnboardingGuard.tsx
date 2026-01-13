import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Loader2 } from 'lucide-react';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  // TEMPORARILY DISABLED - just render children directly
  return <>{children}</>;

  // Original logic (commented out for future re-enabling):
  // const { completed, loading } = useOnboarding();
  //
  // if (loading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-background">
  //       <Loader2 className="w-8 h-8 text-primary animate-spin" />
  //     </div>
  //   );
  // }
  //
  // if (!completed) {
  //   return <OnboardingWizard />;
  // }
  //
  // return <>{children}</>;
};
