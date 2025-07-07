import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Brain, 
  Image, 
  MessageSquare, 
  BarChart3, 
  Users, 
  Home,
  Settings,
  LogOut
} from "lucide-react";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

const navigationItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Home,
  },
  {
    id: "ugc-creator",
    label: "UGC Creator",
    icon: Image,
    active: true,
  },
  {
    id: "content-strategist",
    label: "Content Strategist",
    icon: MessageSquare,
    comingSoon: true,
  },
  {
    id: "analytics-advisor",
    label: "Analytics Advisor",
    icon: BarChart3,
    comingSoon: true,
  },
  {
    id: "customer-insights",
    label: "Customer Insights",
    icon: Users,
    comingSoon: true,
  },
];

export const Sidebar = ({ currentView, onNavigate }: SidebarProps) => {
  return (
    <div className="w-64 bg-gradient-secondary border-r border-border/50 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-primary shadow-glow">
            <Brain className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Business AI</h1>
            <p className="text-xs text-muted-foreground">AI-Powered Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Navigation
        </div>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isDisabled = item.comingSoon;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-11 px-3",
                isActive && "bg-primary/10 text-primary border border-primary/20",
                isDisabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !isDisabled && onNavigate(item.id)}
              disabled={isDisabled}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.comingSoon && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                  Soon
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 space-y-2">
        <Button variant="ghost" className="w-full justify-start gap-3">
          <Settings className="h-5 w-5" />
          Settings
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};