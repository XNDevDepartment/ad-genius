import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Shield, Trash2, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PrivacyPanelProps {
  onClose: () => void;
}

interface PrivacySettings {
  showGenerationHistory: boolean;
  analyticsEnabled: boolean;
  publicGalleryEnabled: boolean;
  loginNotificationsEnabled: boolean;
}

export const PrivacyPanel = ({ onClose }: PrivacyPanelProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user, resetPassword, signOut } = useAuth();
  
  const [settings, setSettings] = useState<PrivacySettings>({
    showGenerationHistory: true,
    analyticsEnabled: true,
    publicGalleryEnabled: false,
    loginNotificationsEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('show_generation_history, analytics_enabled, public_gallery_enabled, login_notifications_enabled')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setSettings({
            showGenerationHistory: data.show_generation_history ?? true,
            analyticsEnabled: data.analytics_enabled ?? true,
            publicGalleryEnabled: data.public_gallery_enabled ?? false,
            loginNotificationsEnabled: data.login_notifications_enabled ?? true,
          });
        }
      } catch (error) {
        console.error('Failed to load privacy settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [user]);

  // Convert camelCase to snake_case for database
  const toSnakeCase = (key: string): string => {
    return key.replace(/([A-Z])/g, '_$1').toLowerCase();
  };

  const updateSetting = async (key: keyof PrivacySettings, value: boolean) => {
    if (!user) return;
    
    // Optimistic update
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaving(true);
    
    try {
      const dbKey = toSnakeCase(key);
      const { error } = await supabase
        .from('profiles')
        .update({ [dbKey]: value })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: t("account.privacy.settingSaved"),
        description: t("account.privacy.settingSavedDesc"),
      });
    } catch (error) {
      // Revert on error
      setSettings(prev => ({ ...prev, [key]: !value }));
      toast({
        title: t("account.privacy.error"),
        description: t("account.privacy.errorSavingSettings"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    
    setChangingPassword(true);
    
    try {
      const { error } = await resetPassword(user.email);
      
      if (error) throw error;
      
      toast({
        title: t("account.privacy.passwordResetSent"),
        description: t("account.privacy.passwordResetSentDesc"),
      });
    } catch (error: any) {
      toast({
        title: t("account.privacy.error"),
        description: error.message || t("account.privacy.errorChangingPassword"),
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE') return;
    
    setDeleting(true);
    
    try {
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { userId: user.id }
      });
      
      if (error) throw error;
      
      toast({
        title: t("account.privacy.accountDeleted"),
        description: t("account.privacy.accountDeletedDesc"),
      });
      
      // Sign out and redirect
      await signOut();
    } catch (error: any) {
      toast({
        title: t("account.privacy.error"),
        description: error.message || t("account.privacy.errorDeletingAccount"),
        variant: "destructive",
      });
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("account.privacy.privacySettings")}
          </CardTitle>
          <CardDescription>{t("account.privacy.privacySettingsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("account.privacy.showGenerationHistory")}</Label>
              <p className="text-sm text-muted-foreground">{t("account.privacy.showGenerationHistoryDesc")}</p>
            </div>
            <Switch 
              checked={settings.showGenerationHistory}
              onCheckedChange={(checked) => updateSetting('showGenerationHistory', checked)}
              disabled={loading || saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("account.privacy.analyticsData")}</Label>
              <p className="text-sm text-muted-foreground">{t("account.privacy.analyticsDataDesc")}</p>
            </div>
            <Switch 
              checked={settings.analyticsEnabled}
              onCheckedChange={(checked) => updateSetting('analyticsEnabled', checked)}
              disabled={loading || saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t("account.privacy.contentVisibility")}
          </CardTitle>
          <CardDescription>{t("account.privacy.contentVisibilityDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("account.privacy.publicGallery")}</Label>
              <p className="text-sm text-muted-foreground">{t("account.privacy.publicGalleryDesc")}</p>
            </div>
            <Switch 
              checked={settings.publicGalleryEnabled}
              onCheckedChange={(checked) => updateSetting('publicGalleryEnabled', checked)}
              disabled={loading || saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("account.privacy.dataManagement")}</CardTitle>
          <CardDescription>{t("account.privacy.dataManagementDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/20">
            <div>
              <h4 className="font-medium text-destructive">{t("account.privacy.deleteAccount")}</h4>
              <p className="text-sm text-muted-foreground">{t("account.privacy.deleteAccountDesc")}</p>
            </div>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t("account.privacy.delete")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("account.privacy.security")}</CardTitle>
          <CardDescription>{t("account.privacy.securityDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("account.privacy.loginNotifications")}</Label>
              <p className="text-sm text-muted-foreground">{t("account.privacy.loginNotificationsDesc")}</p>
            </div>
            <Switch 
              checked={settings.loginNotificationsEnabled}
              onCheckedChange={(checked) => updateSetting('loginNotificationsEnabled', checked)}
              disabled={loading || saving}
            />
          </div>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleChangePassword}
            disabled={changingPassword}
          >
            {changingPassword ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("account.privacy.sendingEmail")}
              </>
            ) : (
              t("account.privacy.changePassword")
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              {t("account.privacy.confirmDeleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>{t("account.privacy.confirmDeleteDesc")}</p>
              <div className="space-y-2">
                <Label>{t("account.privacy.typeDeleteToConfirm")}</Label>
                <Input
                  placeholder="DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="uppercase"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmText !== 'DELETE' || deleting}
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.deleting")}
                </>
              ) : (
                t("account.privacy.confirmDelete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
