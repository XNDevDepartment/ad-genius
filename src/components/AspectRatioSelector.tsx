// OrientationSelector.tsx  (rename to AspectRatioSelector.tsx if you like)
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTranslation } from "react-i18next";

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

interface AspectRatioSelectorProps {
  value: AspectRatio;
  onChange: (value: AspectRatio) => void;
}

const box = (w: string, h: string, active: boolean) =>
  `bg-transparent border ${active ? 'border-white-500' : 'border-gray-500'} mr-2 ${w} ${h}`;

export default function AspectRatioSelector({ value, onChange }: AspectRatioSelectorProps) {
  const { t } = useTranslation();

  const options: Array<{
    value: AspectRatio;
    label: string;
    description: string;
    iconWidth: string;
    iconHeight: string;
  }> = [
    { value: '1:1',  label: t('ugc.orientation.square'),    description: t('ugc.orientation.squareDesc'),    iconWidth: 'w-5', iconHeight: 'h-5' },
    { value: '3:4',  label: t('ugc.orientation.portrait3/4'),  description: t('ugc.orientation.portraitDesc3/4'),  iconWidth: 'w-5', iconHeight: 'h-7' },
    //{ value: '9:16', label: t('ugc.orientation.portrait9/16'),  description: t('ugc.orientation.portraitDesc9/16'),  iconWidth: 'w-5', iconHeight: 'h-8' },
    { value: '4:3',  label: t('ugc.orientation.landscape4/3'), description: t('ugc.orientation.landscapeDesc4/3'), iconWidth: 'w-7', iconHeight: 'h-5' },
    //{ value: '16:9', label: t('ugc.orientation.landscape16/9'), description: t('ugc.orientation.landscapeDesc16/9'), iconWidth: 'w-8', iconHeight: 'h-5' },
  ];

  return (
    <div className="space-y-3">
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as AspectRatio)}
        className="justify-start grid grid-cols-3 gap-1"
      >
        {options.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value} size="sm" className="text-xs px-2 py-1 bg-muted">
            <div className={box(o.iconWidth, o.iconHeight, o.value === value)} />
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
