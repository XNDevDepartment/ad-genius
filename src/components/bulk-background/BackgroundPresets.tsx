import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, Home, Camera, BookOpen, TreeDeciduous, Building2, Snowflake } from "lucide-react";
import { 
  BackgroundCategory, 
  backgroundCategories, 
  getPresetsByCategory 
} from "@/data/background-presets";

interface BackgroundPresetsProps {
  selectedPreset: string | null;
  onSelect: (presetId: string) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  Home: <Home className="h-4 w-4" />,
  Camera: <Camera className="h-4 w-4" />,
  BookOpen: <BookOpen className="h-4 w-4" />,
  TreeDeciduous: <TreeDeciduous className="h-4 w-4" />,
  Building2: <Building2 className="h-4 w-4" />,
  Snowflake: <Snowflake className="h-4 w-4" />
};

const BackgroundPresets = ({ selectedPreset, onSelect }: BackgroundPresetsProps) => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<BackgroundCategory>("studio");

  const categories = Object.entries(backgroundCategories) as [BackgroundCategory, typeof backgroundCategories[BackgroundCategory]][];

  return (
    <div className="space-y-4">
      <Tabs value={activeCategory} onValueChange={(val) => setActiveCategory(val as BackgroundCategory)}>
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {categories.map(([key, { labelKey, icon }]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {categoryIcons[icon]}
              <span className="hidden sm:inline">{t(labelKey)}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(([categoryKey]) => (
          <TabsContent key={categoryKey} value={categoryKey} className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {getPresetsByCategory(categoryKey).map((preset) => (
                <Card
                  key={preset.id}
                  onClick={() => onSelect(preset.id)}
                  className={cn(
                    "relative cursor-pointer overflow-hidden transition-all hover:scale-105 bg-muted/30 border-2",
                    selectedPreset === preset.id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-primary/50"
                  )}
                >
                  {/* Placeholder for preset thumbnail */}
                  <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground text-center px-2">
                      {preset.name}
                    </span>
                  </div>

                  {/* Selected indicator */}
                  {selectedPreset === preset.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}

                  {/* Name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white font-medium truncate">
                      {preset.name}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default BackgroundPresets;
