import { Home, Plus, Image, User, Video, Crown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useCredits } from "@/hooks/useCredits";
import { motion } from "framer-motion";

const BottomTabBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { t } = useTranslation();
  const { isFreeTier } = useCredits();

  const isFree = isFreeTier();

  const tabs = [
    { id: "home", label: t('navigation.home'), icon: Home, path: "/" },
    { id: "library", label: t('navigation.library'), icon: Image, path: "/library" },
    { id: "create", label: t('navigation.create'), icon: Plus, path: "/create", primary: true },
    { id: "videos", label: t('navigation.videos'), icon: Video, path: "/videos" },
    ...(isFree
      ? [{ id: "upgrade", label: t('navigation.upgrade'), icon: Crown, path: "/pricing", highlight: true }]
      : [{ id: "account", label: t('navigation.account'), icon: User, path: "/account" }]
    ),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/50 z-50 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {tabs.map((tab, index) => {
          const isActive = currentPath === tab.path;
          const Icon = tab.icon;

          if (tab.primary) {
            return (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const }}
              >
              <Link to={tab.path} className="touch-manipulation">
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
              </motion.div>
            );
          }

          const isHighlight = 'highlight' in tab && tab.highlight && !isActive;

          return (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const }}
            >
            <Link
              to={tab.path}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all text-xs min-h-[44px] min-w-[44px] touch-manipulation active:scale-95",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : isHighlight
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {isHighlight && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                )}
              </div>
              <span className="font-medium">{tab.label}</span>
            </Link>
            </motion.div>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;