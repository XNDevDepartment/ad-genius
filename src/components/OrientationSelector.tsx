import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface OrientationSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const orientationOptions = [
  {
    value: '3:2',
    label: ' Landscape (3:2)',
    description: 'Horizontal format',
    iconWidth: 'w-7',
    iconHeight: 'h-5'
  },
  {
    value: '1:1',
    label: 'Square (1:1)',
    description: 'Square format ',
    iconWidth: 'w-5',
    iconHeight: 'h-5'
  },
  {
    value: '2:3',
    label: 'Portrait (2:3)',
    description: 'Vertical format ',
    iconWidth: 'w-5',
    iconHeight: 'h-7'
  }
];

const OrientationSelector = ({ value, onChange }: OrientationSelectorProps) => {
  return (
    <div className="space-y-3">
      {/* <Label className="text-sm font-medium text-foreground">
        Image Orientation
      </Label> */}
      <ToggleGroup
          type="single"
          value={value}
          onValueChange={(e) => onChange(e)}
          className="justify-start grid grid-cols-3 gap-1"
        >
        {orientationOptions.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value} className="text-xs px-2 py-1">
            <div className={`bg-transparent border ${option.value === value ? 'border-white-500' : 'border-gray-500' } mr-2 ${option.iconWidth} ${option.iconHeight}`} />
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};

export default OrientationSelector;