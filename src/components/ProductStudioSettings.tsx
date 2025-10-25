import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BackgroundType, ShadowStyle, LightingStyle, StudioSettings } from "@/pages/ProductStudioBackground";

interface ProductStudioSettingsProps {
  settings: StudioSettings;
  onSettingsChange: (updates: Partial<StudioSettings>) => void;
}

export const ProductStudioSettings = ({ settings, onSettingsChange }: ProductStudioSettingsProps) => {
  const backgroundTypes: { value: BackgroundType; label: string }[] = [
    { value: "white", label: "White" },
    { value: "black", label: "Black" },
    { value: "gradient", label: "Gradient" },
    { value: "custom", label: "Custom Color" },
    { value: "scene", label: "Lifestyle Scene" }
  ];

  const shadowStyles: { value: ShadowStyle; label: string }[] = [
    { value: "none", label: "None" },
    { value: "soft", label: "Soft Shadow" },
    { value: "hard", label: "Hard Shadow" },
    { value: "reflection", label: "Reflection" }
  ];

  const lightingStyles: { value: LightingStyle; label: string }[] = [
    { value: "neutral", label: "Neutral" },
    { value: "warm", label: "Warm" },
    { value: "cool", label: "Cool" },
    { value: "dramatic", label: "Dramatic" }
  ];

  const outputFormats: { value: "jpg" | "png" | "webp"; label: string }[] = [
    { value: "jpg", label: "JPG" },
    { value: "png", label: "PNG (transparent)" },
    { value: "webp", label: "WebP (optimized)" }
  ];

  return (
    <div className="space-y-6">
      {/* Background Type */}
      <div>
        <Label className="text-base mb-3 block">Background Type</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {backgroundTypes.map((type) => (
            <Button
              key={type.value}
              variant={settings.backgroundType === type.value ? "default" : "outline"}
              onClick={() => onSettingsChange({ backgroundType: type.value })}
              className={settings.backgroundType === type.value ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Color Picker */}
      {settings.backgroundType === "custom" && (
        <div>
          <Label htmlFor="customColor">Custom Color</Label>
          <Input
            id="customColor"
            type="color"
            value={settings.customColor || "#ffffff"}
            onChange={(e) => onSettingsChange({ customColor: e.target.value })}
            className="h-12 w-full cursor-pointer"
          />
        </div>
      )}

      {/* Shadow Style */}
      <div>
        <Label className="text-base mb-3 block">Shadow Style</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {shadowStyles.map((shadow) => (
            <Button
              key={shadow.value}
              variant={settings.shadowStyle === shadow.value ? "default" : "outline"}
              onClick={() => onSettingsChange({ shadowStyle: shadow.value })}
              className={settings.shadowStyle === shadow.value ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {shadow.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Lighting Style */}
      <div>
        <Label className="text-base mb-3 block">Lighting</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {lightingStyles.map((lighting) => (
            <Button
              key={lighting.value}
              variant={settings.lighting === lighting.value ? "default" : "outline"}
              onClick={() => onSettingsChange({ lighting: lighting.value })}
              className={settings.lighting === lighting.value ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {lighting.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Output Format */}
      <div>
        <Label className="text-base mb-3 block">Output Format</Label>
        <div className="grid grid-cols-3 gap-2">
          {outputFormats.map((format) => (
            <Button
              key={format.value}
              variant={settings.outputFormat === format.value ? "default" : "outline"}
              onClick={() => onSettingsChange({ outputFormat: format.value })}
              className={settings.outputFormat === format.value ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {format.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
