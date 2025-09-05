import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X, Shield, Download, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface PrivacyPanelProps {
  onClose: () => void;
}

export const PrivacyPanel = ({ onClose }: PrivacyPanelProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDownloadData = () => {
    toast({
      title: "Data export requested",
      description: "We'll send your data to your email within 24 hours.",
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account deletion requested",
      description: "We'll process your request within 7 business days.",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{t("account.privacy.title")}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("account.privacy.privacySettings")}
          </CardTitle>
          <CardDescription>{t("account.privacy.privacySettingsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Profile Visibility</Label>
              <p className="text-sm text-muted-foreground">Make your profile visible to other users</p>
            </div>
            <Switch />
          </div> */}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("account.privacy.showGenerationHistory")}</Label>
              <p className="text-sm text-muted-foreground">{t("account.privacy.showGenerationHistoryDesc")}</p>
            </div>
              <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("account.privacy.analyticsData")}</Label>
              <p className="text-sm text-muted-foreground">{t("account.privacy.analyticsDataDesc")}</p>
            </div>
            <Switch defaultChecked />
          </div>

          {/* AT THE MOMENT IS NOT NECESSARY */}
          {/* <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Third-party Integrations</Label>
              <p className="text-sm text-muted-foreground">Allow connections to external services</p>
            </div>
            <Switch />
          </div> */}
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
            <Switch />
          </div>

          {/* <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Search Indexing</Label>
              <p className="text-sm text-muted-foreground">Allow search engines to index your public content</p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Social Sharing</Label>
              <p className="text-sm text-muted-foreground">Enable social media sharing buttons</p>
            </div>
            <Switch defaultChecked />
          </div> */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("account.privacy.dataManagement")}</CardTitle>
          <CardDescription>{t("account.privacy.dataManagementDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Export Your Data</h4>
              <p className="text-sm text-muted-foreground">Download a copy of all your data</p>
            </div>
            <Button variant="outline" onClick={handleDownloadData}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div> */}

          <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/20">
            <div>
              <h4 className="font-medium text-destructive">{t("account.privacy.deleteAccount")}</h4>
              <p className="text-sm text-muted-foreground">{t("account.privacy.deleteAccountDesc")}</p>
            </div>
            <Button variant="destructive" onClick={handleDeleteAccount}>
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
          {/* <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
            <Button variant="outline" size="sm">
              Enable
            </Button>
          </div> */}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("account.privacy.loginNotifications")}</Label>
              <p className="text-sm text-muted-foreground">{t("account.privacy.loginNotificationsDesc")}</p>
            </div>
            <Switch defaultChecked />
          </div>

          <Button variant="outline" className="w-full">
            {t("account.privacy.changePassword")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};