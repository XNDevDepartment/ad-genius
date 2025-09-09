import { AuthModal } from '@/components/auth/AuthModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const SignIn = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSuccess = () => {
    navigate('/');
  };

  return (
    <AuthModal 
      defaultMode="signin"
      onSuccess={handleSuccess}
    />
  );
};

export default SignIn;