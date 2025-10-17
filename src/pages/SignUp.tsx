import { AuthModal } from '@/components/auth/AuthModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { trackSignUp } from '@/lib/metaPixel';

const SignUp = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSuccess = (email?: string) => {
    // Track the sign-up event in Meta Pixel
    trackSignUp();
    
    if (email) {
      navigate('/email-confirmation', { state: { email } });
    } else {
      navigate('/');
    }
  };

  return (
    <AuthModal 
      defaultMode="signup"
      onSuccess={handleSuccess}
    />
  );
};

export default SignUp;