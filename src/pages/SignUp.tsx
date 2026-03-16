import { AuthModal } from '@/components/auth/AuthModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import SEO from '@/components/SEO';

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
    navigate(getRedirectPath());
  };

  return (
    <>
      <SEO
        title="Sign Up"
        description="Create your ProduktPix account and start generating AI product photos for free."
        path="/signup"
      />
      <AuthModal 
        defaultMode="signup"
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default SignUp;