import { Label } from "@/components/ui/label";

interface OrientationSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const orientationOptions = [
  {
    value: '4:3',
    label: 'Instagram Post (4:3)',
    description: 'Horizontal format for Instagram posts',
    iconWidth: 'w-8',
    iconHeight: 'h-6'
  },
  {
    value: '1:1',
    label: 'Instagram Square (1:1)',
    description: 'Square format for Instagram',
    iconWidth: 'w-6',
    iconHeight: 'h-6'
  },
  {
    value: '3:4',
    label: 'Facebook Landscape (3:4)',
    description: 'Vertical format for Facebook',
    iconWidth: 'w-5',
    iconHeight: 'h-7'
  }
];

const OrientationSelector = ({ value, onChange }: OrientationSelectorProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-foreground">
        Image Orientation
      </Label>
      <div className="grid gap-3">
        {orientationOptions.map((option) => (
          <label
            key={option.value}
            className={`flex items-center gap-4 p-4 rounded-apple border-2 cursor-pointer transition-all ${
              value === option.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30 hover:bg-primary/5'
            }`}
          >
            <input
              type="radio"
              name="orientation"
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
            
            {/* Visual aspect ratio preview - more accurate representation */}
            <div className="flex items-center gap-3">
              <div className={`bg-foreground rounded-sm ${option.iconWidth} ${option.iconHeight}`} />
              <span className="text-sm font-mono text-muted-foreground">
                {option.value}
              </span>
            </div>
            
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">
                {option.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {option.description}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default OrientationSelector;