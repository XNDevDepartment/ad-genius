import { Home, Plus, Image, User, Sparkles, LogOut, Settings } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/AuthModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AdminAccessButton } from "@/components/AdminAccessButton";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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

const navigationItems = [
  { id: "home", icon: Home, path: "/", userAuth: false },
  { id: "create", icon: Plus, path: "/create", primary: true, userAuth: true },
  { id: "library", icon: Image, path: "/library", userAuth: true },
  { id: "account", icon: User, path: "/account", userAuth: false },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const currentPath = location.pathname;

  const navigate = useNavigate();
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground";

  const isCollapsed = state === "collapsed";

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      <Sidebar className={isCollapsed ? "w-24" : "w-64"} collapsible="icon">
        <SidebarHeader className={isCollapsed ? "p-3" : "p-6"}>
          <div className="flex items-center justify-center">
            <div className={cn(
              "flex items-center justify-center ",
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
            {/* {!isCollapsed && (
              <div className="ml-3">
                <h1 className="text-lg font-bold text-sidebar-foreground">Produkt Pix</h1>
                <p className="text-xs text-sidebar-foreground/60">Genius</p>
              </div>
            )} */}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 py-6">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  if(item.userAuth && !user) return;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.path}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            active
                              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
                            isCollapsed && "justify-center px-3"
                          )}
                        >
                          <Icon className={cn(
                            "h-5 w-5 transition-colors",
                            active && "text-sidebar-primary-foreground"
                          )} />
                          {!isCollapsed && (
                            <span className="font-medium">{t(`navigation.${item.id}`)}</span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
 
        </SidebarContent>

        <SidebarFooter className="p-4">
          {user &&
            <SidebarGroup>
            <SidebarGroupLabel>{t('settings.quickSettings')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className={cn(
                "flex gap-2 px-2",
                isCollapsed ? "flex-col items-center" : "flex-row"
              )}>
                <ThemeToggle variant="ghost" size={isCollapsed ? "icon" : "default"} />
                <LanguageSelector variant="ghost" size={isCollapsed ? "icon" : "default"} />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>}
          <div className="space-y-3">
            {/* Admin Access Button */}
            {user && <AdminAccessButton />}
            
            {user ? (
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  isCollapsed && "justify-center px-3"
                )}
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5" />
                {!isCollapsed && <span>{t('auth.signOut')}</span>}
              </Button>
            ) : (
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
              <div className="text-xs text-sidebar-foreground/40 text-center">
                Genius UGC v3.0
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}