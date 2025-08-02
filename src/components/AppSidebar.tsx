import { Home, Plus, Image, User, Sparkles, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/AuthModal";
import { useState } from "react";

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
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "create", label: "Criar", icon: Plus, path: "/create", primary: true },
  { id: "library", label: "Biblioteca", icon: Image, path: "/library" },
  { id: "account", label: "Conta", icon: User, path: "/account" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground";

  const isCollapsed = state === "collapsed";

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      <Sidebar className={isCollapsed ? "w-20" : "w-64"} collapsible="icon">
        <SidebarHeader className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            {!isCollapsed && (
              <div className="ml-3">
                <h1 className="text-lg font-bold text-sidebar-foreground">Genius UGC</h1>
                <p className="text-xs text-sidebar-foreground/60">Marketing com IA</p>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 py-6">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
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
                            <span className="font-medium">{item.label}</span>
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
          <div className="space-y-3">
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
                {!isCollapsed && <span>Sair</span>}
              </Button>
            ) : (
              <Button 
                onClick={() => setShowAuthModal(true)}
                className={cn(
                  "w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg",
                  isCollapsed && "px-3"
                )}
              >
                {isCollapsed ? <User className="h-5 w-5" /> : "Entrar / Registrar"}
              </Button>
            )}
            {!isCollapsed && (
              <div className="text-xs text-sidebar-foreground/40 text-center">
                Genius UGC v1.0
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}