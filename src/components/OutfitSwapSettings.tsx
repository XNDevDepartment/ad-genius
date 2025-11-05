import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslation } from "react-i18next";

interface OutfitSwapSettingsProps {
  settings: {
    outputFormat: "jpg" | "png" | "both";
  };
  onChange: (settings: any) => void;
}

export const OutfitSwapSettings = ({ settings, onChange }: OutfitSwapSettingsProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold">{t('outfitSwap.settings.title')}</h3>

      <div className="space-y-2">
        <Label>{t('outfitSwap.settings.outputFormat')}</Label>
        <RadioGroup
          value={settings.outputFormat}
          onValueChange={(value) => onChange({ ...settings, outputFormat: value })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="jpg" id="jpg" />
            <Label htmlFor="jpg" className="font-normal cursor-pointer">
              {t('outfitSwap.settings.formats.jpg')}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="png" id="png" />
            <Label htmlFor="png" className="font-normal cursor-pointer">
              {t('outfitSwap.settings.formats.png')}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="both" id="both" />
            <Label htmlFor="both" className="font-normal cursor-pointer">
              {t('outfitSwap.settings.formats.both')}
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};
