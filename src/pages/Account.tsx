import { ArrowLeft, Settings, CreditCard, HelpCircle, LogOut, Bell, Shield, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { useToast } from "@/hooks/use-toast";

const Account = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  if (!user) {
    return <AuthModal onSuccess={() => navigate("/account")} />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleMenuClick = (section: string) => {
    toast({
      title: `${section} clicked`,
      description: `${section} panel would open here.`,
    });
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

      <div className="container-responsive px-4 py-8 max-w-6xl">
        <h1 className="text-2xl lg:text-3xl font-bold hidden lg:block mb-8">Account</h1>
        
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Profile Card - Left Column */}
          <div className="lg:col-span-2">
            <Card className="bg-muted/30">
              <CardContent className="p-8">
                <div className="flex flex-col items-center space-y-6">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {user.user_metadata?.name?.[0] || user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div className="text-center space-y-3">
                    <h2 className="text-2xl font-semibold">
                      {user.user_metadata?.name || "Francisco"}
                    </h2>
                    <p className="text-muted-foreground">{user.email}</p>
                    <p className="text-muted-foreground text-sm">Founder</p>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleMenuClick("Edit Profile")}
                  >
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Menu Items - Right Column */}
          <div className="lg:col-span-3 space-y-2">
            {/* Settings */}
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none"
              onClick={() => handleMenuClick("Settings")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Settings</h3>
                  <p className="text-sm text-muted-foreground">App preferences and notifications</p>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none"
              onClick={() => handleMenuClick("Notifications")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Notifications</h3>
                  <p className="text-sm text-muted-foreground">Manage your notification preferences</p>
                </div>
              </CardContent>
            </Card>

            {/* Privacy */}
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none"
              onClick={() => handleMenuClick("Privacy")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Privacy</h3>
                  <p className="text-sm text-muted-foreground">Data and privacy settings</p>
                </div>
              </CardContent>
            </Card>

            {/* Billing */}
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none"
              onClick={() => handleMenuClick("Billing")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Billing</h3>
                  <p className="text-sm text-muted-foreground">Manage your subscription</p>
                </div>
              </CardContent>
            </Card>

            {/* Help & Support */}
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none"
              onClick={() => handleMenuClick("Help & Support")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Help & Support</h3>
                  <p className="text-sm text-muted-foreground">Get help and contact support</p>
                </div>
              </CardContent>
            </Card>

            {/* Sign Out */}
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none mt-8"
              onClick={handleSignOut}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-destructive">Sign Out</h3>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;