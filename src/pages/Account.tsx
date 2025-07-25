import { ArrowLeft, User, Settings, CreditCard, HelpCircle, LogOut, Bell, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/pages/Profile";

const Account = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  if (!user) {
    return <Profile onBack={() => navigate("/")} />;
  }

  const menuItems = [
    { icon: Settings, label: "Settings", description: "App preferences and notifications" },
    { icon: Bell, label: "Notifications", description: "Manage your notification preferences" },
    { icon: Shield, label: "Privacy", description: "Data and privacy settings" },
    { icon: CreditCard, label: "Billing", description: "Manage your subscription" },
    { icon: HelpCircle, label: "Help & Support", description: "Get help and contact support" },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <div className="flex items-center gap-4 p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Account</h1>
        </div>
      </div>

      <div className="container-responsive px-4 py-8 space-y-6">
        <h1 className="text-2xl lg:text-3xl font-bold hidden lg:block">Account</h1>
        
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-apple p-6 shadow-apple">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-primary/10 rounded-apple flex items-center justify-center">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {user.user_metadata?.name || user.email}
                  </h3>
                  <p className="text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user.user_metadata?.profession || 'Usuário'}
                  </p>
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
              <Button variant="outline" className="w-full lg:w-auto" onClick={handleSignOut}>
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