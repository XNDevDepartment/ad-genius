import { Home, Plus, Image, User, Video } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const BottomTabBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { t } = useTranslation();

  const tabs = [
    { id: "home", label: t('navigation.home'), icon: Home, path: "/" },
    { id: "library", label: t('navigation.library'), icon: Image, path: "/library" },
    { id: "create", label: t('navigation.create'), icon: Plus, path: "/create", primary: true },
    { id: "videos", label: t('navigation.videos'), icon: Video, path: "/videos" },
    { id: "account", label: t('navigation.account'), icon: User, path: "/account" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/50 z-50 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.path;
          const Icon = tab.icon;

          if (tab.primary) {
            return (
              <Link key={tab.id} to={tab.path} className="touch-manipulation">
                <Button 
                  variant="default"
                  size="sm"
                  className={cn(
                    "text-xs gap-1 h-12 px-4 min-h-[44px] min-w-[44px] transition-transform active:scale-95 ",
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
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all text-xs min-h-[44px] min-w-[44px] touch-manipulation active:scale-95",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;