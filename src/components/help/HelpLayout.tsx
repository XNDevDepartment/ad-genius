import { ArrowLeft, Home, HelpCircle, BookOpen, Video, Code } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

const helpNavItems = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: BookOpen,
    path: "/help/getting-started",
    description: "Quick setup guide"
  },
  {
    id: "faq",
    label: "FAQ",
    icon: HelpCircle,
    path: "/help/faq",
    description: "Common questions"
  },
  {
    id: "api-docs",
    label: "API Documentation",
    icon: Code,
    path: "/help/api-docs",
    description: "Technical reference"
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Globe,
    path: "/help/integrations",
    description: "Shopify, Zapier & more"
  },
];

interface HelpLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumbTitle: string;
}

export function HelpLayout({ children, title, breadcrumbTitle }: HelpLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <div className="flex items-center gap-4 p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/account")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <div className="border-b bg-background/95 backdrop-blur-sm">
          <div className="container max-w-6xl px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to="/">
                          <Home className="h-4 w-4" />
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to="/account">Account</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{breadcrumbTitle}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <h1 className="text-2xl font-bold">{title}</h1>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/account")}
              >
                Back to Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Sidebar Navigation - Hidden on mobile */}
          <div className="hidden lg:block">
            <div className="sticky top-8 space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Help Topics</h3>
              {helpNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link key={item.id} to={item.path}>
                    <Card className={cn(
                      "cursor-pointer transition-colors border-0 shadow-none",
                      active 
                        ? "bg-primary/10 border-primary/20" 
                        : "hover:bg-muted/50"
                    )}>
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          active 
                            ? "bg-primary/20 text-primary" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium",
                            active && "text-primary"
                          )}>
                            {item.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}