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
    <div className="lg:grid lg:grid-cols-3 lg:gap-8">
      {/* Profile Card - Left Side */}
      <div className="lg:col-span-1">
        <Card className="sticky top-8">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </h2>
                <p className="text-muted-foreground">{user?.email}</p>
                <Badge variant="secondary">Pro Member</Badge>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleMenuClick("edit-profile")}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Options - Right Side */}
      <div className="lg:col-span-2 space-y-2 mt-6 lg:mt-0">
        <h1 className="text-2xl lg:text-3xl font-bold lg:hidden mb-6">Account</h1>
        
        <Button
          variant="ghost"
          className="w-full justify-start h-14 px-4"
          onClick={() => handleMenuClick("settings")}
        >
          <Settings className="h-5 w-5 mr-3" />
          <div className="flex-1 text-left">
            <div className="font-medium">Settings</div>
            <div className="text-sm text-muted-foreground">Preferences and defaults</div>
          </div>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start h-14 px-4"
          onClick={() => handleMenuClick("notifications")}
        >
          <Bell className="h-5 w-5 mr-3" />
          <div className="flex-1 text-left">
            <div className="font-medium">Notifications</div>
            <div className="text-sm text-muted-foreground">Email and push notifications</div>
          </div>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start h-14 px-4"
          onClick={() => handleMenuClick("privacy")}
        >
          <Shield className="h-5 w-5 mr-3" />
          <div className="flex-1 text-left">
            <div className="font-medium">Privacy</div>
            <div className="text-sm text-muted-foreground">Data and security settings</div>
          </div>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start h-14 px-4"
          onClick={() => handleMenuClick("billing")}
        >
          <CreditCard className="h-5 w-5 mr-3" />
          <div className="flex-1 text-left">
            <div className="font-medium">Billing</div>
            <div className="text-sm text-muted-foreground">Subscription and usage</div>
          </div>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start h-14 px-4"
          onClick={() => handleMenuClick("help")}
        >
          <HelpCircle className="h-5 w-5 mr-3" />
          <div className="flex-1 text-left">
            <div className="font-medium">Help & Support</div>
            <div className="text-sm text-muted-foreground">Documentation and contact</div>
          </div>
        </Button>

        <Separator className="my-4" />

        <Button
          variant="ghost"
          className="w-full justify-start h-14 px-4 text-destructive hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          <div className="flex-1 text-left">
            <div className="font-medium">Sign Out</div>
            <div className="text-sm text-muted-foreground">Sign out of your account</div>
          </div>
        </Button>
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