import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MagazineStyle, ColorGrading, Mood, BackgroundStyle } from "@/pages/MagazinePhotoshoot";

interface MagazineSettingsProps {
  settings: {
    style: MagazineStyle;
    colorGrading: ColorGrading;
    mood: Mood;
    background: BackgroundStyle;
    numVariations: number;
  };
  onSettingsChange: (updates: Partial<MagazineSettingsProps["settings"]>) => void;
}

export const MagazineSettings = ({ settings, onSettingsChange }: MagazineSettingsProps) => {
  const styles: { value: MagazineStyle; label: string; desc: string }[] = [
    { value: "vogue", label: "Vogue Editorial", desc: "High-fashion, dramatic" },
    { value: "street", label: "Street Fashion", desc: "Urban, candid" },
    { value: "luxury", label: "Luxury Campaign", desc: "Premium, sophisticated" },
    { value: "avant-garde", label: "Avant-Garde", desc: "Artistic, experimental" },
    { value: "classic", label: "Classic Portrait", desc: "Timeless, elegant" },
    { value: "cinematic", label: "Moody Cinematic", desc: "Film-like, atmospheric" }
  ];

  const colorGradings: { value: ColorGrading; label: string }[] = [
    { value: "warm", label: "Warm" },
    { value: "cool", label: "Cool" },
    { value: "bw", label: "B&W" },
    { value: "vintage", label: "Vintage" },
    { value: "vibrant", label: "Vibrant" }
  ];

  const moods: { value: Mood; label: string }[] = [
    { value: "dramatic", label: "Dramatic" },
    { value: "elegant", label: "Elegant" },
    { value: "playful", label: "Playful" },
    { value: "mysterious", label: "Mysterious" }
  ];

  const backgrounds: { value: BackgroundStyle; label: string }[] = [
    { value: "studio", label: "Studio" },
    { value: "urban", label: "Urban" },
    { value: "nature", label: "Nature" },
    { value: "abstract", label: "Abstract" }
  ];

  return (
    <div className="space-y-6">
      {/* Photoshoot Style */}
      <div>
        <Label className="text-base mb-3 block">Photoshoot Style</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {styles.map((style) => (
            <Button
              key={style.value}
              variant={settings.style === style.value ? "default" : "outline"}
              onClick={() => onSettingsChange({ style: style.value })}
              className={`h-auto flex-col items-start p-4 ${
                settings.style === style.value ? "bg-orange-500 hover:bg-orange-600" : ""
              }`}
            >
              <span className="font-semibold">{style.label}</span>
              <span className="text-xs opacity-80">{style.desc}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Color Grading */}
      <div>
        <Label className="text-base mb-3 block">Color Grading</Label>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {colorGradings.map((grading) => (
            <Button
              key={grading.value}
              variant={settings.colorGrading === grading.value ? "default" : "outline"}
              onClick={() => onSettingsChange({ colorGrading: grading.value })}
              className={settings.colorGrading === grading.value ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {grading.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Mood */}
      <div>
        <Label className="text-base mb-3 block">Mood</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {moods.map((mood) => (
            <Button
              key={mood.value}
              variant={settings.mood === mood.value ? "default" : "outline"}
              onClick={() => onSettingsChange({ mood: mood.value })}
              className={settings.mood === mood.value ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {mood.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Background */}
      <div>
        <Label className="text-base mb-3 block">Background</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {backgrounds.map((bg) => (
            <Button
              key={bg.value}
              variant={settings.background === bg.value ? "default" : "outline"}
              onClick={() => onSettingsChange({ background: bg.value })}
              className={settings.background === bg.value ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {bg.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Number of Variations */}
      <div>
        <Label className="text-base mb-3 block">Number of Variations</Label>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((num) => (
            <Button
              key={num}
              variant={settings.numVariations === num ? "default" : "outline"}
              onClick={() => onSettingsChange({ numVariations: num })}
              className={settings.numVariations === num ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {num}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
