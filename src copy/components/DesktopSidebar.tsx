import { Home, Plus, Image, User, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DesktopSidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navigationItems = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    { id: "create", label: "Create", icon: Plus, path: "/create", primary: true },
    { id: "library", label: "Library", icon: Image, path: "/library" },
    { id: "account", label: "Account", icon: User, path: "/account" },
  ];

  return (
    <aside className="hidden lg:flex desktop-sidebar bg-card/50 backdrop-blur-xl border-r border-border/50 flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-apple flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">AI Studio</h1>
            <p className="text-xs text-muted-foreground">Product Generator</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-apple-sm transition-spring text-sm font-medium",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-apple" 
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                  item.primary && !isActive && "text-primary hover:text-primary"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
                {item.primary && (
                  <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <div className="text-xs text-muted-foreground text-center">
          AI Product Studio v1.0
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;