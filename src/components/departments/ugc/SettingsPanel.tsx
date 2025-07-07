import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Settings } from "lucide-react";

export interface ImageSettings {
  width: number;
  height: number;
  quality: 'standard' | 'hd';
  numberOfImages: number;
  format: 'png' | 'jpg';
}

interface SettingsPanelProps {
  settings: ImageSettings;
  onSettingsChange: (settings: ImageSettings) => void;
}

export const SettingsPanel = ({ settings, onSettingsChange }: SettingsPanelProps) => {
  const updateSetting = (key: keyof ImageSettings, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Image Settings
        </CardTitle>
        <CardDescription>
          Configure your image generation preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="width">Width</Label>
            <Input
              id="width"
              type="number"
              value={settings.width}
              onChange={(e) => updateSetting('width', parseInt(e.target.value) || 1024)}
              min={512}
              max={2048}
              step={64}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Height</Label>
            <Input
              id="height"
              type="number"
              value={settings.height}
              onChange={(e) => updateSetting('height', parseInt(e.target.value) || 1024)}
              min={512}
              max={2048}
              step={64}
            />
          </div>
        </div>

        {/* Quality */}
        <div className="space-y-2">
          <Label>Quality</Label>
          <Select
            value={settings.quality}
            onValueChange={(value: 'standard' | 'hd') => updateSetting('quality', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="hd">HD (Higher Quality)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Number of Images */}
        <div className="space-y-2">
          <Label htmlFor="numberOfImages">Number of Images</Label>
          <Select
            value={settings.numberOfImages.toString()}
            onValueChange={(value) => updateSetting('numberOfImages', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Image</SelectItem>
              <SelectItem value="2">2 Images</SelectItem>
              <SelectItem value="3">3 Images</SelectItem>
              <SelectItem value="4">4 Images</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Format */}
        <div className="space-y-2">
          <Label>Output Format</Label>
          <Select
            value={settings.format}
            onValueChange={(value: 'png' | 'jpg') => updateSetting('format', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG (Lossless)</SelectItem>
              <SelectItem value="jpg">JPG (Smaller file)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};