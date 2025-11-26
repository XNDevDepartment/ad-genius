import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * AuthGuard ensures authentication is fully loaded before rendering children.
 * This prevents race conditions where components mount before auth state is ready.
 * 
 * Usage:
 * <AuthGuard>
 *   <YourAuthenticatedComponent />
 * </AuthGuard>
 */
export const AuthGuard = ({ children, redirectTo = '/account' }: AuthGuardProps) => {
  const { loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectTo);
    }
  }, [loading, user, navigate, redirectTo]);

  // Show spinner while auth is loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Don't render until authenticated
  if (!user) {
    return null;
  }

  return <>{children}</>;
};
