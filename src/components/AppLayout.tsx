import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import BottomTabBar from "./BottomTabBar";
import NavigationHeader from "./NavigationHeader";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";

const AppLayout = () => {
  const location = useLocation();
  const showHeader = location.pathname === "/";

  const { user, loading } = useAuth();
  const shouldShowSidebar = !loading && user;

  // Desktop-specific debugging
  useEffect(() => {
    console.log('[AppLayout - Desktop] State:', {
      loading,
      hasUser: !!user,
      pathname: location.pathname,
      shouldShowSidebar
    });
  }, [loading, user, location.pathname, shouldShowSidebar]);


  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* <AnnouncementBanner /> */}
        {showHeader && <NavigationHeader />}
        <main className="pb-20">
          <Outlet />
        </main>
        {(user && (location.pathname !== '/create/ugc' && location.pathname !== '/create/ugc')) &&
          <BottomTabBar />
        }
      </div>

      {/* Desktop Layout with Shadcn Sidebar */}
      <div className="hidden lg:block">
        {shouldShowSidebar ? (
          // Authenticated layout with sidebar
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <div className="flex-1 flex flex-col">
                <main className="flex-1">
                  <Outlet />
                </main>
              </div>
            </div>
          </SidebarProvider>
        ) : (
          // Public/loading layout without sidebar
          <div className="flex flex-col min-h-screen w-full">
            <main className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center min-h-screen">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <Outlet />
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppLayout;