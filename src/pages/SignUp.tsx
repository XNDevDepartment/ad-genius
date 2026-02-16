import { AuthModal } from '@/components/auth/AuthModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { trackSignUp } from '@/lib/metaPixel';

const getRedirectPath = () => {
  const promo = sessionStorage.getItem('promo_redirect');
  if (promo) {
    sessionStorage.removeItem('promo_redirect');
    return promo;
  }
  return '/';
};

const SignUp = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate(getRedirectPath());
    }
  }, [user, navigate]);

  const handleSuccess = () => {
    trackSignUp();
    navigate(getRedirectPath());
  };

  return (
    <AuthModal 
      defaultMode="signup"
      onSuccess={handleSuccess}
    />
  );
};

export default SignUp;