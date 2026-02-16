import { AuthModal } from '@/components/auth/AuthModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const getRedirectPath = () => {
  const promo = sessionStorage.getItem('promo_redirect');
  if (promo) {
    sessionStorage.removeItem('promo_redirect');
    return promo;
  }
  return '/';
};

const SignIn = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate(getRedirectPath());
    }
  }, [user, navigate]);

  const handleSuccess = () => {
    navigate(getRedirectPath());
  };

  return (
    <AuthModal 
      defaultMode="signin"
      onSuccess={handleSuccess}
    />
  );
};

export default SignIn;