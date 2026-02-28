import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, X, Image as ImageIcon, Grid3X3, Pencil, Check, Camera, BookOpen, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BackgroundCategory,
  backgroundCategories,
  modelBackgroundPresets,
  getPresetsByCategory,
} from "@/data/background-presets";

// const ALLOWED_CATEGORIES: BackgroundCategory[] = ["studio", "magazine", "seasonal"];
const ALLOWED_CATEGORIES: BackgroundCategory[] = ["studio"];

const categoryIcons: Record<string, React.ReactNode> = {
  Camera: <Camera className="h-4 w-4" />,
  BookOpen: <BookOpen className="h-4 w-4" />,
  Snowflake: <Snowflake className="h-4 w-4" />,
};

interface OutfitSwapBackgroundPickerProps {
  selectedPreset: string | null;
  customBackground: File | null;
  promptValue: string;
  onPresetSelect: (presetId: string | null) => void;
  onCustomUpload: (file: File | null) => void;
  onPromptChange: (value: string) => void;
}

type PickerMode = "custom" | "preset";

const OutfitSwapBackgroundPicker = ({
  selectedPreset,
  customBackground,
  promptValue,
  onPresetSelect,
  onCustomUpload,
  onPromptChange,
}: OutfitSwapBackgroundPickerProps) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<PickerMode>("preset");
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<BackgroundCategory>("studio");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCategories = ALLOWED_CATEGORIES.map((key) => ({
    key,
    ...backgroundCategories[key],
  }));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onCustomUpload(file);
      onPresetSelect(null);
      const reader = new FileReader();
      reader.onload = () => setCustomPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCustom = () => {
    onCustomUpload(null);
    setCustomPreview(null);
    onPromptChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePresetSelect = (presetId: string) => {
    onPresetSelect(presetId);
    onCustomUpload(null);
    setCustomPreview(null);
    // Auto-populate prompt from preset
    const preset = backgroundPresets.find((p) => p.id === presetId);
    if (preset) {
      onPromptChange(preset.prompt);
    }
  };

  const hasSelection = selectedPreset !== null || customBackground !== null;

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === "preset" ? "default" : "outline"}
          onClick={() => setMode("preset")}
          className="flex-1 gap-2 text-xs sm:text-sm min-w-0"
        >
          <Grid3X3 className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("bulkBackground.selectBackground.choosePreset")}</span>
        </Button>
        <Button
          variant={mode === "custom" ? "default" : "outline"}
          onClick={() => setMode("custom")}
          className="flex-1 gap-2 text-xs sm:text-sm min-w-0"
        >
          <Upload className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("bulkBackground.selectBackground.uploadCustom")}</span>
        </Button>
      </div>

      {/* Preset Selection */}
      {mode === "preset" && (
        <Tabs value={activeCategory} onValueChange={(val) => setActiveCategory(val as BackgroundCategory)}>
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {filteredCategories.map(({ key, labelKey, icon }) => (
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

          {filteredCategories.map(({ key }) => (
            <TabsContent key={key} value={key} className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {getPresetsByCategory(key).map((preset) => (
                  <Card
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset.id)}
                    className={cn(
                      "relative cursor-pointer overflow-hidden transition-all hover:scale-105 bg-muted/30 border-2",
                      selectedPreset === preset.id
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-primary/50"
                    )}
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={preset.thumbnail}
                        alt={t(preset.nameKey)}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    {selectedPreset === preset.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-xs text-white font-medium truncate">
                        {t(preset.nameKey)}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Custom Upload */}
      {mode === "custom" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("bulkBackground.selectBackground.uploadHint")}
          </p>
          {customPreview ? (
            <Card className="relative overflow-hidden bg-transparent">
              <img src={customPreview} alt="Custom background" className="w-full h-full object-cover" />
              <Button
                variant="secondary"
                size="icon"
                onClick={handleRemoveCustom}
                className="absolute top-2 right-2 h-8 w-8 bg-background/80 backdrop-blur-sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </Card>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed rounded-apple p-12 transition-colors border-border hover:border-primary/50 bg-transparent"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-apple-sm flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {t("bulkBackground.selectBackground.uploadCustom")}
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
                </div>
              </div>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        </div>
      )}

      {/* Editable Prompt Field */}
      {hasSelection && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium text-foreground">
              {t("bulkBackground.prompt.label")}
            </label>
          </div>
          <Textarea
            value={promptValue}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder={t("bulkBackground.prompt.placeholder")}
            className="min-h-[80px] rounded-apple-sm text-sm"
          />
          <p className="text-xs text-muted-foreground">{t("bulkBackground.prompt.hint")}</p>
        </div>
      )}
    </div>
  );
};

export default OutfitSwapBackgroundPicker;
