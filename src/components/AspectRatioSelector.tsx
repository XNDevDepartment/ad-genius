import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTranslation } from "react-i18next";
import { Crown } from "lucide-react";

export type AspectRatio = '1:1' | '2:3' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9' | 'source';

interface AspectRatioSelectorProps {
  value: AspectRatio;
  onChange: (value: AspectRatio) => void;
  lockedRatios?: AspectRatio[];
}

const box = (w: string, h: string, active: boolean) =>
  `bg-transparent border ${active ? 'border-white-500' : 'border-gray-500'} mr-2 ${w} ${h}`;

export default function AspectRatioSelector({ value, onChange, lockedRatios = [] }: AspectRatioSelectorProps) {
  const { t } = useTranslation();

  const options: Array<{
    value: AspectRatio;
    label: string;
    iconWidth: string;
    iconHeight: string;
  }> = [
    { value: 'source', label: t('ugc.orientation.source'), iconWidth: 'w-6', iconHeight: 'h-6' },
    { value: '1:1',  label: t('ugc.orientation.square'),    iconWidth: 'w-5', iconHeight: 'h-5' },
    { value: '2:3',  label: '2:3',  iconWidth: 'w-5', iconHeight: 'h-7' },
    { value: '3:4',  label: t('ugc.orientation.portrait3/4'),  iconWidth: 'w-5', iconHeight: 'h-7' },
    { value: '4:5',  label: '4:5',  iconWidth: 'w-5', iconHeight: 'h-6' },
    { value: '9:16', label: t('ugc.orientation.portrait9/16'),  iconWidth: 'w-4', iconHeight: 'h-8' },
    { value: '5:4',  label: '5:4',  iconWidth: 'w-6', iconHeight: 'h-5' },
    { value: '4:3',  label: t('ugc.orientation.landscape4/3'), iconWidth: 'w-7', iconHeight: 'h-5' },
    { value: '16:9', label: t('ugc.orientation.landscape16/9'), iconWidth: 'w-8', iconHeight: 'h-4' },
    { value: '21:9', label: '21:9', iconWidth: 'w-8', iconHeight: 'h-3' },
  ];

  return (
    <div className="space-y-3">
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => {
          if (v && !lockedRatios.includes(v as AspectRatio)) {
            onChange(v as AspectRatio);
          }
        }}
        className="justify-start grid grid-cols-3 gap-1"
      >
        {options.map((o) => {
          const isLocked = lockedRatios.includes(o.value);
          return (
            <ToggleGroupItem
              key={o.value}
              value={o.value}
              size="sm"
              className={`text-xs px-2 py-1 bg-muted ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLocked}
            >
              {o.value !== 'source' && (<div className={box(o.iconWidth, o.iconHeight, o.value === value)} />)}
              {o.label}
              {isLocked && <Crown className="h-3 w-3 ml-1 text-primary" />}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
