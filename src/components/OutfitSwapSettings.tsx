import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface OutfitSwapSettingsProps {
  settings: {
    outputFormat: "jpg" | "png" | "both";
  };
  onChange: (settings: any) => void;
}

export const OutfitSwapSettings = ({ settings, onChange }: OutfitSwapSettingsProps) => {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold">Settings</h3>

      <div className="space-y-2">
        <Label>Output Format</Label>
        <RadioGroup
          value={settings.outputFormat}
          onValueChange={(value) => onChange({ ...settings, outputFormat: value })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="jpg" id="jpg" />
            <Label htmlFor="jpg" className="font-normal cursor-pointer">
              JPG (Smaller file size)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="png" id="png" />
            <Label htmlFor="png" className="font-normal cursor-pointer">
              PNG (Higher quality)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="both" id="both" />
            <Label htmlFor="both" className="font-normal cursor-pointer">
              Both formats
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};
