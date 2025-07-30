import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X, Bell, Mail, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface NotificationsPanelProps {
  onClose: () => void;
}

interface NotificationPreferences {
  email_generation_complete: boolean;
  email_monthly_summary: boolean;
  email_new_features: boolean;
  email_marketing: boolean;
  push_enabled: boolean;
  push_generation_updates: boolean;
  push_credit_alerts: boolean;
  sound_effects: boolean;
}

export const NotificationsPanel = ({ onClose }: NotificationsPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_generation_complete: true,
    email_monthly_summary: true,
    email_new_features: false,
    email_marketing: false,
    push_enabled: false,
    push_generation_updates: false,
    push_credit_alerts: true,
    sound_effects: true
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotificationPreferences();
    }
  }, [user]);

  const loadNotificationPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading notification preferences:', error);
        return;
      }

      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const saveNotificationPreferences = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences
        });

      if (error) {
        console.error('Error saving notification preferences:', error);
        toast({
          title: "Error",
          description: "Failed to save notification preferences. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Preferences saved",
          description: "Your notification preferences have been updated successfully.",
        });
      }
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Not supported",
        description: "Push notifications are not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      handlePreferenceChange('push_enabled', true);
      toast({
        title: "Permission granted",
        description: "Push notifications have been enabled.",
      });
    } else {
      toast({
        title: "Permission denied",
        description: "Push notifications were not enabled.",
        variant: "destructive",
      });
    }
  };

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
            <Switch checked={preferences.email_generation_complete} onCheckedChange={(checked) => handlePreferenceChange('email_generation_complete', checked)} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Monthly Summary</Label>
              <p className="text-sm text-muted-foreground">Monthly report of your activity and credits</p>
            </div>
            <Switch checked={preferences.email_monthly_summary} onCheckedChange={(checked) => handlePreferenceChange('email_monthly_summary', checked)} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>New Features</Label>
              <p className="text-sm text-muted-foreground">Updates about new features and improvements</p>
            </div>
            <Switch checked={preferences.email_new_features} onCheckedChange={(checked) => handlePreferenceChange('email_new_features', checked)} />
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
            <Switch checked={preferences.email_marketing} onCheckedChange={(checked) => handlePreferenceChange('email_marketing', checked)} />
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
            <Switch checked={preferences.push_enabled} onCheckedChange={(checked) => {
              if (checked) {
                requestPushPermission();
              } else {
                handlePreferenceChange('push_enabled', false);
              }
            }} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Generation Updates</Label>
              <p className="text-sm text-muted-foreground">Real-time updates on generation progress</p>
            </div>
            <Switch checked={preferences.push_generation_updates} onCheckedChange={(checked) => handlePreferenceChange('push_generation_updates', checked)} disabled={!preferences.push_enabled} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Credit Alerts</Label>
              <p className="text-sm text-muted-foreground">When your credits are running low</p>
            </div>
            <Switch checked={preferences.push_credit_alerts} onCheckedChange={(checked) => handlePreferenceChange('push_credit_alerts', checked)} disabled={!preferences.push_enabled} />
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
            <Switch checked={preferences.sound_effects} onCheckedChange={(checked) => handlePreferenceChange('sound_effects', checked)} />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={saveNotificationPreferences} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
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