import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

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

  const updateSetting = (key: keyof ImageSettings, value: unknown) => {
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
    <Popover>
    {/* ──────────────────  Trigger button  ────────────────── */}
    <PopoverTrigger asChild>
      <Button
        size="icon"
        aria-label="Open image settings"
        className="shadow-lg hover:shadow-xl transition-all rounded-lg h-9" // style matches your Send btn
      >
        <Settings className="h-4 w-4" />
      </Button>
    </PopoverTrigger>

    {/* ───────────────────  Floating panel  ─────────────────── */}
    <PopoverContent
      side="top"
      align="end"
      className="w-72 p-4 space-y-4 bg-background/95 backdrop-blur-md border border-border/50 shadow-xl rounded-xl"
    >
      {/* Image Size */}
      <div className="space-y-2">
        <Label>Image Size</Label>
        <Select
          value={settings.size}
          onValueChange={(value) => updateSetting("size", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            {sizeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
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
          onValueChange={(value: "low" | "medium" | "high") =>
            updateSetting("quality", value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select quality" />
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
        <Label>Number of Images</Label>
        <Select
          value={settings.numberOfImages.toString()}
          onValueChange={(value) =>
            updateSetting("numberOfImages", parseInt(value))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select number" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 1 }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={n.toString()}>
                {n} Image{n > 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Output Format */}
      <div className="space-y-2">
        <Label>Output Format</Label>
        <Select
          value={settings.format}
          onValueChange={(value: "png" | "jpg") => updateSetting("format", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="png">PNG (Lossless)</SelectItem>
            <SelectItem value="jpg">JPG (Smaller file)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </PopoverContent>
  </Popover>
  );
};