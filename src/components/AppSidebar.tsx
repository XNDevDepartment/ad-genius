import { Home, Plus, Image, User, Sparkles, LogOut, Settings, Video, Layers, Users, Gauge, ChevronDown, UserPlus, Crown, Store } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/AuthModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useCredits } from "@/hooks/useCredits";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoApp from './../assets/logos/logo_horizontal.png';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

// Main navigation items
const mainNavItems: Array<{ id: string; icon: any; path: string; primary?: boolean; adminOnly?: boolean }> = [
  { id: "home", icon: Home, path: "/" },
  { id: "create", icon: Plus, path: "/create", primary: true },
  { id: "pricing", icon: Crown, path: "/pricing", primary: true },
  // { id: "grupo", icon: Layers, path: "/bulk", adminOnly: true },
];

// Your Content navigation items
const contentNavItems: Array<{ id: string; icon: any; path: string; disabled?: boolean; comingSoon?: boolean }> = [
  { id: "library", icon: Image, path: "/library" },
  // { id: "models", icon: Users, path: "/create/custom-model" },
  { id: "videos", icon: Video, path: "/videos" },
  { id: "shopify", icon: Store, path: "/shopify/products", disabled: true, comingSoon: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const { isAdmin } = useAdminAuth();
  const { tier, isFreeTier, getRemainingCredits, getTotalCredits } = useCredits();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const currentPath = location.pathname;

  const navigate = useNavigate();
  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const isCollapsed = state === "collapsed";

  const handleSignOut = async () => {
    await signOut();
  };

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <>
      <Sidebar className={isCollapsed ? "w-24 pt-10" : "w-64 p-3"} collapsible="icon" variant="floating">
        {/* User Header Section */}
        <SidebarHeader className={isCollapsed ? "p-3" : "p-4"}>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "flex items-center gap-3 w-full rounded-lg p-2 hover:bg-sidebar-accent transition-colors",
                  isCollapsed && "justify-center"
                )}>
                  <Avatar className="h-9 w-9 border-2 border-sidebar-border">
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <>
                      <span className="font-medium text-sidebar-foreground flex-1 text-left truncate">
                        {t('navigation.personalSpace')}
                      </span>
                      <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/account")}>
                  <User className="mr-2 h-4 w-4" />
                  {t('navigation.account')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/pricing")}>
                  <Crown className="mr-2 h-4 w-4" />
                  {t('navigation.pricing')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('auth.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center justify-center">
              <div className={cn(
                "flex items-center justify-center",
                isCollapsed ? "w-14 h-14" : "w-36 h-12"
              )}>
                <img
                  src={logoApp}
                  alt="Genius_logo"
                  className={cn(
                    "object-contain",
                    isCollapsed ? "w-10 h-10" : "w-40 h-16"
                  )}
                />
              </div>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="px-3 py-4">
          {/* Main Navigation Group */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {mainNavItems.map((item) => {
                  // Hide admin-only items for non-admins
                  if (item.adminOnly && !isAdmin) return null;
                  // Hide items that require auth when not logged in
                  if (item.id !== "home" && !user) return null;

                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.path}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            active
                              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
                            isCollapsed && "justify-center px-3",
                            item.primary && !active && "font-medium"
                          )}
                        >
                          <Icon className={cn(
                            "h-5 w-5 transition-colors",
                            active && "text-sidebar-primary-foreground"
                          )} />
                          {!isCollapsed && (
                            <span className="font-medium">{t(`navigation.${item.id}`)}</span>
                          )}
                          {item.adminOnly && !isCollapsed && (
                            <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">
                              Admin
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Your Content Group - Only show when logged in */}
          {user && (
            <SidebarGroup className="mt-6">
              <SidebarGroupLabel className="px-4 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                {!isCollapsed && t('navigation.yourContent')}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1 mt-2">
                  {contentNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton asChild>
                          {item.disabled ? (
                            <div
                              className={cn(
                                "flex items-center gap-3 px-4 py-2.5 rounded-xl opacity-50 cursor-not-allowed",
                                "text-sidebar-foreground/70",
                                isCollapsed && "justify-center px-3"
                              )}
                            >
                              <Icon className="h-5 w-5" />
                              {!isCollapsed && (
                                <>
                                  <span>{t(`navigation.${item.id}`)}</span>
                                  {item.comingSoon && (
                                    <span className="ml-auto text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                                      Soon
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          ) : (
                            <NavLink
                              to={item.path}
                              className={cn(
                                "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                active
                                  ? "bg-sidebar-primary/10 text-sidebar-primary font-medium"
                                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
                                isCollapsed && "justify-center px-3"
                              )}
                            >
                              <Icon className="h-5 w-5" />
                              {!isCollapsed && (
                                <span>{t(`navigation.${item.id}`)}</span>
                              )}
                            </NavLink>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Hidden Invite People button - can be enabled later */}
          {/* { user && (
            <SidebarGroup className="mt-6">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <button
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 w-full",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          "text-sidebar-foreground/70 hover:text-sidebar-foreground",
                          isCollapsed && "justify-center px-3"
                        )}
                      >
                        <UserPlus className="h-5 w-5" />
                        {!isCollapsed && (
                          <span>{t('navigation.invitePeople')}</span>
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )} */}
        </SidebarContent>

        <SidebarFooter className="p-4">
          {/* Upgrade Button - Only show for free tier users */}
          {user && isFreeTier() && (
            <Button
              onClick={() => navigate("/pricing")}
              className={cn(
                "w-full  from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg mb-4",
                isCollapsed && "px-2"
              )}
              variant="alternative"
            >
              {isCollapsed ? <Crown className="h-5 w-5" /> : t('navigation.upgradeToPro')}
            </Button>
          )}

          {/* Footer Links */}
          {user && (
            <div className="space-y-1">
              {/* Usage */}
              <button
                onClick={() => navigate("/account#billing")}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg w-full transition-colors",
                  "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <Gauge className="h-4 w-4" />
                {!isCollapsed && (
                  <span className="text-sm">{t('navigation.usage')}</span>
                )}
                {!isCollapsed && (
                  <span className="ml-auto text-xs text-sidebar-foreground/50">
                    {getRemainingCredits()}/{getTotalCredits()}
                  </span>
                )}
              </button>

              {/* Preferences */}
              <div className={cn(
                "flex gap-2",
                isCollapsed ? "flex-col items-center" : "flex-row px-2"
              )}>
                <ThemeToggle variant="ghost" size={isCollapsed ? "icon" : "sm"} />
                <LanguageSelector variant="ghost" size={isCollapsed ? "icon" : "sm"} />
              </div>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg w-full transition-colors mt-2",
                  "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <LogOut className="h-4 w-4" />
                {!isCollapsed && <span className="text-sm">{t('auth.signOut')}</span>}
              </button>
            </div>
          )}

          {/* Sign In Button for non-authenticated users */}
          {!user && (
            <Button
              onClick={() => navigate("/account")}
              className={cn(
                "w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg",
                isCollapsed && "px-3"
              )}
            >
              {isCollapsed ? <User className="h-5 w-5" /> : t('auth.signIn')}
            </Button>
          )}

          {!isCollapsed && (
            <div className="text-xs text-sidebar-foreground/40 text-center mt-4">
              Genius UGC v7.0
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
