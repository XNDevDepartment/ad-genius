import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X, Shield, Download, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PrivacyPanelProps {
  onClose: () => void;
}

export const PrivacyPanel = ({ onClose }: PrivacyPanelProps) => {
  const { toast } = useToast();

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
        <h2 className="text-2xl font-semibold">Privacy & Security</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
          <CardDescription>Control how your data is used and shared</CardDescription>
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
              <Label>Show Generation History</Label>
              <p className="text-sm text-muted-foreground">Allow others to see your public generations</p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Analytics Data</Label>
              <p className="text-sm text-muted-foreground">Help improve our service with usage analytics</p>
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
            Content Visibility
          </CardTitle>
          <CardDescription>Control who can see your generated content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Gallery</Label>
              <p className="text-sm text-muted-foreground">Show your images in the public gallery</p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Manage your personal data and account</CardDescription>
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
              <h4 className="font-medium text-destructive">Delete Account</h4>
              <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
            </div>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your account security settings</CardDescription>
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
              <Label>Login Notifications</Label>
              <p className="text-sm text-muted-foreground">Get notified when someone logs into your account</p>
            </div>
            <Switch defaultChecked />
          </div>

          <Button variant="outline" className="w-full">
            Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};