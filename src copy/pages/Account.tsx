import { User, Settings, CreditCard, HelpCircle, LogOut, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const Account = () => {
  const menuItems = [
    { icon: Settings, label: "Settings", description: "App preferences and notifications" },
    { icon: Bell, label: "Notifications", description: "Manage your notification preferences" },
    { icon: Shield, label: "Privacy", description: "Data and privacy settings" },
    { icon: CreditCard, label: "Billing", description: "Manage your subscription" },
    { icon: HelpCircle, label: "Help & Support", description: "Get help and contact support" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container-responsive px-4 py-8 space-y-6">
        <h1 className="text-2xl lg:text-3xl font-bold">Account</h1>
        
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-apple p-6 shadow-apple">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-primary/10 rounded-apple flex items-center justify-center">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Demo User</h3>
                  <p className="text-muted-foreground">demo@example.com</p>
                  <p className="text-sm text-muted-foreground mt-1">Pro Plan</p>
                </div>
                <Button variant="outline" className="w-full">
                  Edit Profile
                </Button>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="lg:col-span-2 mt-6 lg:mt-0">
            <div className="space-y-3">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    className="w-full bg-card rounded-apple p-4 shadow-apple hover:shadow-apple-lg transition-spring text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-apple-sm flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{item.label}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <Button variant="outline" className="w-full lg:w-auto">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;