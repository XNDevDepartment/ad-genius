import { Outlet, useLocation } from "react-router-dom";
import BottomTabBar from "./BottomTabBar";
import NavigationHeader from "./NavigationHeader";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { AnnouncementBanner } from "./AnnouncementBanner";

const AppLayout = () => {
  const location = useLocation();
  const showHeader = location.pathname === "/";

  const { user, loading } = useAuth();


  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Layout */}
      <div className="lg:hidden">
        <AnnouncementBanner />
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
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              {!loading && user &&
              <AppSidebar />
              }
              <div className="flex-1 flex flex-col">
                <AnnouncementBanner />
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
            </div>
          </SidebarProvider>
      </div>
    </div>
  );
};

export default AppLayout;