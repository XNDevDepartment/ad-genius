
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  Brain, 
  Home,
  LogOut,
  Menu,
  User,
  FileImage
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { ConversationsList } from "@/components/ConversationsList";
import { useState } from "react";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onSelectConversation?: (threadId: string) => void;
  onNewConversation?: () => void;
  currentThreadId?: string;
}

const navigationItems = [
  {
    id: "dashboard",
    label: "Painel",
    icon: Home,
  },
  {
    id: "library",
    label: "Biblioteca",
    icon: FileImage,
  },
];

export const Sidebar = ({ 
  currentView, 
  onNavigate, 
  onSelectConversation, 
  onNewConversation, 
  currentThreadId 
}: SidebarProps) => {
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleNavigation = (itemId: string) => {
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
            <h1 className="font-bold text-lg">Genius UGC </h1>
            <p className="text-xs text-muted-foreground">Marketing com IA</p>
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
                {user.user_metadata?.profession || 'Usuário'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 p-4 space-y-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Navegação
        </div>

        {/* Main Navigation */}
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-11 px-3",
                isActive && "bg-primary/10 text-primary border border-primary/20"
              )}
              onClick={() => handleNavigation(item.id)}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1 text-left">{item.label}</span>
            </Button>
          );
        })}

        {/* Separator */}
        <div className="h-4" />

        {/* Conversations Section - Only show when logged in */}
        {/* {user && onSelectConversation && onNewConversation && (
          <ConversationsList
            onSelectConversation={onSelectConversation}
            onNewConversation={onNewConversation}
            currentThreadId={currentThreadId}
          />
        )} */}
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
              Perfil
            </Button>
            {/* <Button variant="ghost" className="w-full justify-start gap-3">
              <Settings className="h-5 w-5" />
              Settings
            </Button> */}
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-muted-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              Sair
            </Button>
          </>
        ) : (
          <Button 
            onClick={() => setShowAuthModal(true)}
            className="w-full"
          >
            Entrar / Registrar
          </Button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64  border-r border-border/50 flex-col h-screen fixed left-0 top-0 z-40">
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
