import { ArrowLeft, Settings, CreditCard, HelpCircle, LogOut, Bell, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { AuthModal } from "@/components/auth/AuthModal";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { ProfileEditPanel } from "@/components/account/ProfileEditPanel";
import { SettingsPanel } from "@/components/account/SettingsPanel";
import { NotificationsPanel } from "@/components/account/NotificationsPanel";
import { PrivacyPanel } from "@/components/account/PrivacyPanel";
import { BillingPanel } from "@/components/account/BillingPanel";
import { HelpSupportPanel } from "@/components/account/HelpSupportPanel";
import { useTranslation } from "react-i18next";

const Account = () => {
  const navigate = useNavigate();
  const { user, signOut, subscriptionData } = useAuth();
  const { tier } = useCredits();
  const [section, setSection] = useState<string>("");
  const { t } = useTranslation();

  const [layout, setLayout] = useState("grid");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const { toast } = useToast();

  if (!user) {
    return <AuthModal onSuccess={() => navigate("/")} />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleSaveProfile = () => {
    setIsEditingProfile(false);
    toast({
      title: t('account.toasts.profileUpdated.title'),
      description: t('account.toasts.profileUpdated.description'),
    });
  };

  const handleMenuClick = (clickedSection: string) => {
    if(clickedSection  == section){
      setSection("")
    }else{
      setSection(clickedSection)
    }
  };

  // const handleDownloadData = () => {
  //   toast({
  //     title: t('account.toasts.dataExportRequested.title'),
  //     description: t('account.toasts.dataExportRequested.description'),
  //   });
  // };

  // const handleDeleteAccount = () => {
  //   toast({
  //     title: t('account.toasts.accountDeletionRequested.title'),
  //     description: t('account.toasts.accountDeletionRequested.description'),
  //     variant: "destructive",
  //   });
  // };

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
                <Badge variant={subscriptionData?.subscribed ? "default" : "secondary"}>
                  {tier} {t('account.member')}
                </Badge>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleMenuClick("edit-profile")}
              >
                {t('account.editProfile')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items - Right Column */}
      <div className="lg:col-span-3 space-y-2">
        {/* Settings */}
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none bg-transparent"
          onClick={() => handleMenuClick("settings")}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{t('account.sections.settings')}</h3>
              <p className="text-sm text-muted-foreground">{t('account.sections.settingsDescription')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none bg-transparent"
          onClick={() => handleMenuClick("notifications")}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{t('account.sections.notifications')}</h3>
              <p className="text-sm text-muted-foreground">{t('account.sections.notificationsDescription')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none bg-transparent"
          onClick={() => handleMenuClick("privacy")}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{t('account.sections.privacy')}</h3>
              <p className="text-sm text-muted-foreground">{t('account.sections.privacyDescription')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Billing */}
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none bg-transparent"
          onClick={() => handleMenuClick("billing")}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{t('account.sections.billing')}</h3>
              <p className="text-sm text-muted-foreground">{t('account.sections.billingDescription')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none bg-transparent"
          onClick={() => handleMenuClick("help")}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{t('account.sections.helpSupport')}</h3>
              <p className="text-sm text-muted-foreground">{t('account.sections.helpSupportDescription')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none mt-8 bg-transparent"
          onClick={handleSignOut}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-destructive">{t('account.signOut')}</h3>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background container-responsive px-4 py-4">
      <div className="lg:hidden flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {if(section === "") {navigate("/")} else {setSection("")} }}
            className="min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold">
            {section === "" ? t('account.title') :
             section === "edit-profile" ? t('account.editProfile.title') :
             section === "settings" ? t('account.settings.title') :
             section === "notifications" ? t('account.notifications.title') :
             section === "privacy" ? t('account.privacy.title') :
             section === "billing" ? t('account.billing.title') :
             section === "help" ? t('account.helpSupport.title') : t('account.title')}
          </h1>
        </div>
      </div>

      <div className="container-responsive px-4 py-4 lg:py-8 max-w-6xl safe-area-bottom">
        <div className="hidden lg:flex items-center gap-4 mb-8">
          {(section !== "") && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSection("")}
              className="min-h-[44px] min-w-[44px]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-2xl lg:text-3xl font-bold">
            {section === "" ? t('account.title') : 
             section === "edit-profile" ? t('account.editProfile.title') :
             section === "settings" ? t('account.settings.title') :
             section === "notifications" ? t('account.notifications.title') :
             section === "privacy" ? t('account.privacy.title') :
             section === "billing" ? t('account.billing.title') :
             section === "help" ? t('account.helpSupport.title') : t('account.title')}
          </h1>
        </div>

        {section === "edit-profile" && <ProfileEditPanel onClose={() => setSection("")} />}
        {section === "settings" && <SettingsPanel layout={layout} setLayout={setLayout} onClose={() => setSection("")} />}
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