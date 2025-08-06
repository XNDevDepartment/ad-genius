import { Outlet, useLocation } from "react-router-dom";
import BottomTabBar from "./BottomTabBar";
import NavigationHeader from "./NavigationHeader";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AdminAccessButton } from "./AdminAccessButton";
import { useAuth } from "@/contexts/AuthContext";

const AppLayout = () => {
  const location = useLocation();
  const showHeader = location.pathname === "/";

  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Layout */}
      <div className="lg:hidden">
        {showHeader && <NavigationHeader />}
        <main className="pb-20">
          <Outlet />
        </main>
        {user &&
          <BottomTabBar />
        }
      </div>

      {/* Desktop Layout with Shadcn Sidebar */}
      <div className="hidden lg:block">
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              {user &&
              <AppSidebar />
              }
              <div className="flex-1 flex flex-col">
                <header className="h-12 flex items-center border-b px-4 justify-between">
                {user &&
                  <SidebarTrigger />
                }
                  <AdminAccessButton />
                </header>
                <main className="flex-1">
                  <Outlet />
                </main>
              </div>
            </div>
          </SidebarProvider>
      </div>
    </div>
  );
};

export default AppLayout;