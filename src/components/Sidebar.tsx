
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  Brain, 
  Image, 
  MessageSquare, 
  BarChart3, 
  Users, 
  Home,
  Settings,
  LogOut,
  Menu,
  FileImage,
  User
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { useState } from "react";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

const navigationItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Home,
  },
  {
    id: "library",
    label: "Library",
    icon: FileImage,
    active: true,
    requireAuth: true,
  },
  {
    id: "ugc_creator",
    label: "UGC Creator",
    icon: Image,
    active: true,
    requireAuth: true,
  },
  {
    id: "content-strategist",
    label: "Content Strategist",
    icon: MessageSquare,
    comingSoon: true,
  },
  {
    id: "analytics-advisor",
    label: "Analytics Advisor",
    icon: BarChart3,
    comingSoon: true,
  },
  {
    id: "customer-insights",
    label: "Customer Insights",
    icon: Users,
    comingSoon: true,
  },
];

export const Sidebar = ({ currentView, onNavigate }: SidebarProps) => {
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleNavigation = (itemId: string) => {
    const item = navigationItems.find(nav => nav.id === itemId);
    if (item?.requireAuth && !user) {
      setShowAuthModal(true);
      return;
    }
    onNavigate(itemId);
  };

  const handleSignOut = async () => {
    await signOut();
    if (currentView === "library" || currentView === "profile") {
      onNavigate("dashboard");
    }
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-primary shadow-glow">
            <Brain className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Business AI</h1>
            <p className="text-xs text-muted-foreground">AI-Powered Platform</p>
          </div>
        </div>
      </div>

      {/* User Section */}
      {user && (
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.user_metadata?.profile_picture} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.user_metadata?.name || user.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.user_metadata?.profession || 'User'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 p-4 space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Navigation
        </div>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isDisabled = item.comingSoon || (item.requireAuth && !user);

          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-11 px-3",
                isActive && "bg-primary/10 text-primary border border-primary/20",
                isDisabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !isDisabled && handleNavigation(item.id)}
              disabled={isDisabled}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.comingSoon && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                  Soon
                </span>
              )}
              {item.requireAuth && !user && (
                <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded">
                  Login
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 space-y-2">
        {user ? (
          <>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3"
              onClick={() => onNavigate("profile")}
            >
              <User className="h-5 w-5" />
              Profile
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Settings className="h-5 w-5" />
              Settings
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-muted-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          </>
        ) : (
          <Button 
            onClick={() => setShowAuthModal(true)}
            className="w-full"
          >
            Sign In / Sign Up
          </Button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-gradient-secondary border-r border-border/50 flex-col h-screen fixed left-0 top-0 z-40">
        <SidebarContent />
      </div>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background/80 backdrop-blur-sm">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-gradient-secondary">
            <div className="flex flex-col h-full">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};
