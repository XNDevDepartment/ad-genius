import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VideoDuration, VideoAspectRatio, VideoStyle, CameraMovement, VideoAdSettings } from "@/pages/VideoAds";

interface VideoAdsSettingsProps {
  settings: VideoAdSettings;
  onSettingsChange: (updates: Partial<VideoAdSettings>) => void;
}

export const VideoAdsSettings = ({ settings, onSettingsChange }: VideoAdsSettingsProps) => {
  const durations: VideoDuration[] = [5, 10, 15, 30];
  const aspectRatios: { value: VideoAspectRatio; label: string; platform: string }[] = [
    { value: "1:1", label: "1:1", platform: "Instagram Feed" },
    { value: "9:16", label: "9:16", platform: "Stories/Reels" },
    { value: "16:9", label: "16:9", platform: "YouTube" }
  ];

  const styles: { value: VideoStyle; label: string }[] = [
    { value: "showcase", label: "Product Showcase" },
    { value: "lifestyle", label: "Lifestyle Scene" },
    { value: "text-focused", label: "Text Focused" },
    { value: "dynamic", label: "Dynamic" }
  ];

  const movements: { value: CameraMovement; label: string }[] = [
    { value: "static", label: "Static" },
    { value: "pan", label: "Pan" },
    { value: "zoom", label: "Zoom In" },
    { value: "rotate", label: "Rotate" }
  ];

  return (
    <div className="space-y-6">
      {/* Text Overlays */}
      <div>
        <Label htmlFor="headline" className="text-base mb-2 block">
          Headline Text *
        </Label>
        <Input
          id="headline"
          placeholder="e.g., New Collection 2024"
          value={settings.headlineText}
          onChange={(e) => onSettingsChange({ headlineText: e.target.value })}
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {settings.headlineText.length}/50 characters
        </p>
      </div>

      <div>
        <Label htmlFor="subtitle" className="text-base mb-2 block">
          Subtitle/CTA (Optional)
        </Label>
        <Textarea
          id="subtitle"
          placeholder="e.g., Shop Now & Save 20%"
          value={settings.subtitleText}
          onChange={(e) => onSettingsChange({ subtitleText: e.target.value })}
          maxLength={100}
          rows={2}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {settings.subtitleText.length}/100 characters
        </p>
      </div>

      {/* Duration */}
      <div>
        <Label className="text-base mb-3 block">Video Duration</Label>
        <div className="grid grid-cols-4 gap-2">
          {durations.map((dur) => (
            <Button
              key={dur}
              variant={settings.duration === dur ? "default" : "outline"}
              onClick={() => onSettingsChange({ duration: dur })}
              className={settings.duration === dur ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {dur}s
            </Button>
          ))}
        </div>
      </div>

      {/* Aspect Ratio */}
      <div>
        <Label className="text-base mb-3 block">Aspect Ratio</Label>
        <div className="grid grid-cols-3 gap-2">
          {aspectRatios.map((ratio) => (
            <Button
              key={ratio.value}
              variant={settings.aspectRatio === ratio.value ? "default" : "outline"}
              onClick={() => onSettingsChange({ aspectRatio: ratio.value })}
              className={`h-auto flex-col p-3 ${
                settings.aspectRatio === ratio.value ? "bg-orange-500 hover:bg-orange-600" : ""
              }`}
            >
              <span className="font-semibold">{ratio.label}</span>
              <span className="text-xs opacity-80">{ratio.platform}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Video Style */}
      <div>
        <Label className="text-base mb-3 block">Video Style</Label>
        <div className="grid grid-cols-2 gap-2">
          {styles.map((style) => (
            <Button
              key={style.value}
              variant={settings.style === style.value ? "default" : "outline"}
              onClick={() => onSettingsChange({ style: style.value })}
              className={settings.style === style.value ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {style.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Camera Movement */}
      <div>
        <Label className="text-base mb-3 block">Camera Movement</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {movements.map((movement) => (
            <Button
              key={movement.value}
              variant={settings.cameraMovement === movement.value ? "default" : "outline"}
              onClick={() => onSettingsChange({ cameraMovement: movement.value })}
              className={settings.cameraMovement === movement.value ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {movement.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
