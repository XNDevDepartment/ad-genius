import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Image,
  Megaphone,
  Settings,
  AlertTriangle,
  Box,
  ClipboardCheck,
  Bot,
} from 'lucide-react';

const navItems = [
  { title: 'Overview', url: '/admin', icon: LayoutDashboard },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Revenue', url: '/admin/revenue', icon: DollarSign },
  { title: 'Content', url: '/admin/content', icon: Image },
  { title: 'Marketing', url: '/admin/marketing', icon: Megaphone },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
  { title: 'Errors', url: '/admin/errors', icon: AlertTriangle },
];

const externalItems = [
  { title: 'Base Models', url: '/admin/base-models', icon: Box },
  { title: 'Sub Audit', url: '/admin/subscription-audit', icon: ClipboardCheck },
  { title: 'Genius Agent', url: '/admin/genius-agent', icon: Bot },
];

export const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (url: string) => {
    if (url === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar className="border-r-0 bg-card/50 backdrop-blur-lg">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    className="gap-3 rounded-xl transition-all hover:bg-primary/5 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {externalItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    className="gap-3 rounded-xl transition-all hover:bg-primary/5 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
