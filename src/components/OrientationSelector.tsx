import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTranslation } from "react-i18next";

interface OrientationSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const OrientationSelector = ({ value, onChange }: OrientationSelectorProps) => {
  const { t } = useTranslation();
  
  const orientationOptions = [
    {
      value: '3:2',
      label: t('ugc.orientation.landscape'),
      description: t('ugc.orientation.landscapeDesc'),
      iconWidth: 'w-7',
      iconHeight: 'h-5'
    },
    {
      value: '1:1',
      label: t('ugc.orientation.square'),
      description: t('ugc.orientation.squareDesc'),
      iconWidth: 'w-5',
      iconHeight: 'h-5'
    },
    {
      value: '2:3',
      label: t('ugc.orientation.portrait'),
      description: t('ugc.orientation.portraitDesc'),
      iconWidth: 'w-5',
      iconHeight: 'h-7'
    }
  ];

//   1:1: 1024x1024
// 3:4: 896x1280
// 4:3: 1280x896
// 9:16: 768x1408
// 16:9: 1408x768
// 1:1: 2048x2048
// 3:4: 1792x2560
// 4:3: 2560x1792
// 9:16: 1536x2816
// 16:9: 2816x1536

  return (
    <div className="space-y-3">
      <ToggleGroup
          type="single"
          value={value}
          onValueChange={(e) => onChange(e)}
          className="justify-start grid grid-cols-3 gap-1"
        >
        {orientationOptions.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value} size="sm" className="text-xs px-2 py-1 bg-muted">
            <div className={`bg-transparent border ${option.value === value ? 'border-white-500' : 'border-gray-500' } mr-2 ${option.iconWidth} ${option.iconHeight}`} />
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};

export default OrientationSelector;