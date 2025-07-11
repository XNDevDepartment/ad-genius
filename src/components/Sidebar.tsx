
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  Brain, 
  Home,
  Settings,
  LogOut,
  Menu,
  FileImage,
  User,
  Star,
  Sparkles,
  Megaphone
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { assistants, categories } from "@/data/assistants";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

const navigationItems = [
  {
    id: "dashboard",
    label: "Painel Principal",
    icon: Home,
  },
  {
    id: "library",
    label: "Biblioteca",
    icon: FileImage,
    requireAuth: true,
  },
];

export const Sidebar = ({ currentView, onNavigate }: SidebarProps) => {
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { favorites, isFavorite } = useFavorites();

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

  const favoriteAssistants = assistants.filter(assistant => isFavorite(assistant.id));

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-primary shadow-glow">
            <Brain className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">IA Empresarial</h1>
            <p className="text-xs text-muted-foreground">Plataforma com IA</p>
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
                {user.user_metadata?.profession || 'Utilizador'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Favorites Section */}
        {favoriteAssistants.length > 0 && (
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Favoritos
              </span>
            </div>
            <div className="space-y-1">
              {favoriteAssistants.slice(0, 5).map((assistant) => {
                const Icon = assistant.icon;
                const isActive = currentView === assistant.id;
                const isDisabled = assistant.status === "coming-soon" || (assistant.requireAuth && !user);

                return (
                  <Button
                    key={assistant.id}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start gap-2 h-9 px-2",
                      isActive && "bg-primary/10 text-primary border border-primary/20",
                      isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !isDisabled && onNavigate(assistant.id)}
                    disabled={isDisabled}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 text-left text-sm truncate">{assistant.name}</span>
                    {assistant.status === "active" && (
                      <Sparkles className="h-3 w-3 text-primary" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories Section */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Categorias
            </span>
          </div>
          <div className="space-y-1">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = currentView === category.id;
              const assistantCount = assistants.filter(a => a.category === category.id).length;

              return (
                <Button
                  key={category.id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start gap-2 h-9 px-2",
                    isActive && "bg-primary/10 text-primary border border-primary/20"
                  )}
                  onClick={() => onNavigate(category.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left text-sm truncate">{category.name}</span>
                  <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                    {assistantCount}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Navegação
          </div>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isDisabled = item.requireAuth && !user;

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
                {item.requireAuth && !user && (
                   <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded">
                     Sessão
                   </span>
                )}
              </Button>
            );
          })}
        </div>
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
             <Button variant="ghost" className="w-full justify-start gap-3">
               <Settings className="h-5 w-5" />
               Definições
             </Button>
             <Button 
               variant="ghost" 
               className="w-full justify-start gap-3 text-muted-foreground"
               onClick={handleSignOut}
             >
               <LogOut className="h-5 w-5" />
               Terminar Sessão
             </Button>
           </>
         ) : (
           <Button 
             onClick={() => setShowAuthModal(true)}
             className="w-full"
           >
             Iniciar Sessão / Registar
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
