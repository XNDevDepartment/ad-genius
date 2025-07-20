import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export const AdminAccessButton = () => {
  const { isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => navigate('/admin')}
      className="gap-2"
    >
      <Shield className="w-4 h-4" />
      Admin Panel
    </Button>
  );
};