import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Eye, RefreshCw, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { LanguageSelector } from "../LanguageSelector";
import { useTranslation } from "react-i18next";

interface SettingsPanelProps {
  layout: string;
  setLayout: (layout: string) => void;
  onClose: () => void;
}

interface UserPreferences {
  default_aspect_ratio: string;
  auto_save_images: boolean;
  theme: string;
  language: string;
  timezone: string;
}

export const SettingsPanel = ({ layout, setLayout, onClose }: SettingsPanelProps) => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<UserPreferences>({
    default_aspect_ratio: '1:1',
    auto_save_images: true,
    theme: theme,
    language: 'en',
    timezone: 'utc'
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserPreferences();
    }
  }, [user]);

  const loadUserPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        setPreferences(data);
        if (data.theme) {
          setTheme(data.theme as 'light' | 'dark' | 'auto');
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const saveUserPreferences = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...preferences
        });

      if (error) {
        console.error('Error saving preferences:', error);
        toast({
          title: t("common.error"),
          description: t("account.errorSaving"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("account.settings.saveChanges"),
          description: t("account.profileUpdated"),
        });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: t("common.error"),
        description: t("account.errorSaving"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    if (key === 'theme') {
      setTheme(value as 'light' | 'dark' | 'auto');
    }
  };

  return (
    <div className="space-y-6">
      {/* <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{t("account.settings.title")}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div> */}

      {/* <Card>
        <CardHeader>
          <CardTitle>{t("account.settings.generationDefaults")}</CardTitle>
          <CardDescription>{t("account.settings.generationDefaultsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4"> */}
          {/** NOT NECESSARY AT THE MOMENT */}
          {/* <div className="space-y-2">
            <Label>Image Quality</Label>
            <Slider defaultValue={[75]} max={100} step={1} className="w-full" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Standard</span>
              <span>Premium</span>
            </div>
          </div> */}

          {/* <div className="space-y-2">
            <Label htmlFor="aspectRatio">Default Aspect Ratio</Label>
            <Select value={preferences.default_aspect_ratio} onValueChange={(value) => handlePreferenceChange('default_aspect_ratio', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">Square (1:1)</SelectItem>
                <SelectItem value="4:3">Portrait (4:3)</SelectItem>
                <SelectItem value="3:4">Landscape (3:4)</SelectItem>
                <SelectItem value="16:9">Wide (16:9)</SelectItem>
              </SelectContent>
            </Select>
          </div> */}

          {/* <div className="space-y-2">
            <Label htmlFor="style">Default Style</Label>
            <Select defaultValue="realistic">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realistic">Realistic</SelectItem>
                <SelectItem value="artistic">Artistic</SelectItem>
                <SelectItem value="cartoon">Cartoon</SelectItem>
                <SelectItem value="abstract">Abstract</SelectItem>
              </SelectContent>
            </Select>
          </div> */}

          {/* <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("account.settings.autoSaveImages")}</Label>
              <p className="text-sm text-muted-foreground">{t("account.settings.autoSaveImagesDesc")}</p>
            </div>
            <Switch checked={preferences.auto_save_images} onCheckedChange={(checked) => handlePreferenceChange('auto_save_images', checked)} />
          </div>
        </CardContent>
      </Card> */}

      <Card>
        <CardHeader>
          <CardTitle>{t("account.settings.interfacePreferences")}</CardTitle>
          <CardDescription>{t("account.settings.interfacePreferencesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">{t("account.settings.theme")}</Label>
            <Select value={theme} onValueChange={(value) => handlePreferenceChange('theme', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t("account.settings.light")}</SelectItem>
                <SelectItem value="dark">{t("account.settings.dark")}</SelectItem>
                <SelectItem value="auto">{t("account.settings.system")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* <div className="space-y-2">
            <Label htmlFor="layout">Layout Style</Label>
            <Select value={layout} onValueChange={setLayout}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="list">List</SelectItem>
                <SelectItem value="masonry">Masonry</SelectItem>
              </SelectContent>
            </Select>
          </div> */}

          {/* <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reduced Motion</Label>
              <p className="text-sm text-muted-foreground">Minimize animations and transitions</p>
            </div>
            <Switch />
          </div> */}

          {/* <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Tips</Label>
              <p className="text-sm text-muted-foreground">Display helpful tips and tutorials</p>
            </div>
            <Switch defaultChecked />
          </div> */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("account.settings.language")}</CardTitle>
          <CardDescription>{t("account.settings.languageDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LanguageSelector variant="ghost" size={"default"} />

          {/* <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={preferences.timezone} onValueChange={(value) => handlePreferenceChange('timezone', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utc">UTC</SelectItem>
                <SelectItem value="pst">Pacific Time</SelectItem>
                <SelectItem value="est">Eastern Time</SelectItem>
                <SelectItem value="cet">Central European Time</SelectItem>
              </SelectContent>
            </Select>
          </div> */}

          <div className="flex gap-2 pt-4">
            <Button onClick={saveUserPreferences} disabled={isLoading}>
              {isLoading ? t("account.settings.saving") : t("account.settings.saveChanges")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};