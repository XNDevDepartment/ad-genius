import { Label } from "@/components/ui/label";

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
      <select
        name="orientation"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-apple border-2 border-border p-3 text-sm font-medium text-foreground bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
      >
        {orientationOptions.map((option) => (
          <option key={option.value} value={option.value}>
            <div className={`bg-transparent border border-gray-500 ${option.iconWidth} ${option.iconHeight}`} />
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default OrientationSelector;