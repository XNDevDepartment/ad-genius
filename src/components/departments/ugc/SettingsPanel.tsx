import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

export interface ImageSettings {
  size: string; // e.g., "1024x1024"
  quality: 'low' | 'medium' | 'high';
  numberOfImages: number;
  format: 'png' | 'jpg';
}

interface SettingsPanelProps {
  settings: ImageSettings;
  onSettingsChange: (settings: ImageSettings) => void;
}

export const SettingsPanel = ({ settings, onSettingsChange }: SettingsPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const updateSetting = (key: keyof ImageSettings, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const sizeOptions = [
    { value: "1024x1536", label: "1024 x 1536 (Portrait)" },
    { value: "1024x1024", label: "1024 x 1024 (Square)" },
    { value: "1536x1024", label: "1536 x 1024 (Landscape)" },
  ];

  return (
    <div className="fixed top-16 lg:top-24 right-4 lg:right-6 w-72 lg:w-80 z-50 max-h-[calc(100vh-5rem)] overflow-y-auto">
      <Card className="bg-gradient-card border-border/50 shadow-xl backdrop-blur-sm bg-background/95">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-all duration-200">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Image Settings
                </div>
                <ChevronDown className={`h-4 w-4 transition-all duration-300 ${isOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
              <CardDescription>
                Configure your image generation preferences
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent className="transition-all duration-300 ease-in-out data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <CardContent className="space-y-4">
              {/* Image Size */}
              <div className="space-y-2">
                <Label>Image Size</Label>
                <Select
                  value={settings.size}
                  onValueChange={(value) => updateSetting('size', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <Label>Quality</Label>
                <Select
                  value={settings.quality}
                  onValueChange={(value: 'low' | 'medium' | 'high') => updateSetting('quality', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
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
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} Image{num > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
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
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};