import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X, Bell, Mail, Smartphone } from "lucide-react";

interface NotificationsPanelProps {
  onClose: () => void;
}

export const NotificationsPanel = ({ onClose }: NotificationsPanelProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Notifications</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>Choose which emails you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Generation Complete</Label>
              <p className="text-sm text-muted-foreground">When your image generation is finished</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Monthly Summary</Label>
              <p className="text-sm text-muted-foreground">Monthly report of your activity and credits</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>New Features</Label>
              <p className="text-sm text-muted-foreground">Updates about new features and improvements</p>
            </div>
            <Switch />
          </div>


          {/* <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tips & Tutorials</Label>
              <p className="text-sm text-muted-foreground">Helpful tips to improve your creations</p>
            </div>
            <Switch defaultChecked />
          </div> */}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Marketing & Promotions</Label>
              <p className="text-sm text-muted-foreground">Special offers and promotional content</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>Instant notifications on your device</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">Allow notifications from your browser</p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Generation Updates</Label>
              <p className="text-sm text-muted-foreground">Real-time updates on generation progress</p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Credit Alerts</Label>
              <p className="text-sm text-muted-foreground">When your credits are running low</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            In-App Notifications
          </CardTitle>
          <CardDescription>Notifications within the application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sound Effects</Label>
              <p className="text-sm text-muted-foreground">Play sounds for notifications</p>
            </div>
            <Switch defaultChecked />
          </div>

          {/** Request Approval Before Implementation */}
          {/* <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-dismiss</Label>
              <p className="text-sm text-muted-foreground">Automatically hide notifications after 5 seconds</p>
            </div>
            <Switch />
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
};