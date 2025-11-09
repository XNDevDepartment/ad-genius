import { useTranslation } from "react-i18next";

interface OutfitSwapSettingsProps {
  settings: {};
  onChange: (settings: any) => void;
}

export const OutfitSwapSettings = ({ settings, onChange }: OutfitSwapSettingsProps) => {
  const { t } = useTranslation();
  
  // Settings component kept for future use but currently empty
  // PNG format is now the default and only output format
  return null;
};
