// ResolutionSelector.tsx
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type SizeTier = 'small' | 'medium' | 'large';

export default function ResolutionSelector({
  value,
  onChange
}: {
  value: SizeTier;
  onChange: (value: SizeTier) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as SizeTier)}
      className="justify-start"
    >
      <ToggleGroupItem value="small" size="sm" className="flex-1 bg-muted">1K</ToggleGroupItem>
      <ToggleGroupItem value="medium" size="sm" className="flex-1 bg-muted">2K</ToggleGroupItem>
      <ToggleGroupItem value="large" size="sm" className="flex-1 bg-muted">4K</ToggleGroupItem>
    </ToggleGroup>
  );
}
