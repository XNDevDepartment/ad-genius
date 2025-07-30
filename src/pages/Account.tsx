import { ArrowLeft, User, Settings, CreditCard, HelpCircle, LogOut, Bell, Shield, Upload, Mail, Lock, UserX, Download, Globe, Moon, Sun, Monitor, Grid, List, Eye, EyeOff, Camera, Edit2, Trash2, RefreshCw, ExternalLink, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { ProfileEditPanel } from "@/components/account/ProfileEditPanel";
import { SettingsPanel } from "@/components/account/SettingsPanel";
import { NotificationsPanel } from "@/components/account/NotificationsPanel";
import { PrivacyPanel } from "@/components/account/PrivacyPanel";
import { BillingPanel } from "@/components/account/BillingPanel";
import { HelpSupportPanel } from "@/components/account/HelpSupportPanel";

const Account = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [section, setSection] = useState<string>("");
  const [theme, setTheme] = useState("auto");
  const [layout, setLayout] = useState("grid");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const { toast } = useToast();

  if (!user) {
    return <AuthModal onSuccess={() => navigate("/account")} />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleSaveProfile = () => {
    setIsEditingProfile(false);
    toast({
      title: "Profile updated",
      description: "Your profile has been successfully updated.",
    });
  };

  const handleMenuClick = (clickedSection: string) => {
    if(clickedSection  == section){
      setSection("")
    }else{
      setSection(clickedSection)
    }
  };

  const handleDownloadData = () => {
    toast({
      title: "Data export requested",
      description: "Your data export will be sent to your email within 24 hours.",
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account deletion requested",
      description: "A confirmation email has been sent to verify this action.",
      variant: "destructive",
    });
  };

  const AccountPanel = (
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
                  {user.user_metadata?.name || "User"}
                </h2>
                <p className="text-muted-foreground">{user.email}</p>
                <Badge variant="secondary">Pro Member</Badge>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleMenuClick("edit-profile")}
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
          onClick={() => handleMenuClick("settings")}
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
          onClick={() => handleMenuClick("notifications")}
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
          onClick={() => handleMenuClick("privacy")}
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
          onClick={() => handleMenuClick("billing")}
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
          onClick={() => handleMenuClick("help")}
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
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <div className="flex items-center gap-4 p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {if(section === "") {navigate("/")} else {setSection("")} }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Account</h1>
        </div>
      </div>

      <div className="container-responsive px-4 py-8 max-w-6xl">
        <div className="hidden lg:flex">
          {(section !== "") &&
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSection("")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl lg:text-3xl font-bold hidden lg:block mb-8">Account</h1>
            </>
          }
        </div>

        {section === "edit-profile" && <ProfileEditPanel onClose={() => setSection("")} />}
        {section === "settings" && <SettingsPanel theme={theme} setTheme={setTheme} layout={layout} setLayout={setLayout} onClose={() => setSection("")} />}
        {section === "notifications" && <NotificationsPanel onClose={() => setSection("")} />}
        {section === "privacy" && <PrivacyPanel onClose={() => setSection("")} />}
        {section === "billing" && <BillingPanel onClose={() => setSection("")} />}
        {section === "help" && <HelpSupportPanel onClose={() => setSection("")} />}
        {section === "" && AccountPanel}
      </div>
    </div>
  );
};

export default Account;