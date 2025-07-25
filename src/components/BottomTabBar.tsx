import { Home, Plus, Image, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BottomTabBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    { id: "create", label: "Criar", icon: Plus, path: "/create", primary: true },
    { id: "library", label: "Biblioteca", icon: Image, path: "/library" },
    { id: "account", label: "Conta", icon: User, path: "/account" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/50 z-50">
      <div className="flex items-center justify-around px-4 py-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.path;
          const Icon = tab.icon;

          if (tab.primary) {
            return (
              <Link key={tab.id} to={tab.path}>
                <Button 
                  variant="default" 
                  size="sm"
                  className={cn(
                    "text-xs gap-1 h-12 px-3",
                    isActive && "bg-primary/20 text-primary"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </Button>
              </Link>
            );
          }

          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-apple-sm transition-spring text-xs",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;