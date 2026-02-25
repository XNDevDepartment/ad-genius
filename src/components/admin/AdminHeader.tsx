import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import logoHorizontal from '@/assets/logos/logo_horizontal.png';

export const AdminHeader = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-8 w-8" />
          <img
            src={logoHorizontal}
            alt="Ad Genius"
            className="h-7 object-contain"
          />
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.email}
            </span>
          )}
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
