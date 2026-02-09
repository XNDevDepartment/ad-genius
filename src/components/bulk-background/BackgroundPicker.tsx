import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Image as ImageIcon, Grid3X3, Pencil } from "lucide-react";
import BackgroundPresets from "./BackgroundPresets";

interface BackgroundPickerProps {
  onCustomUpload: (file: File | null) => void;
  onPresetSelect: (presetId: string | null) => void;
  selectedPreset: string | null;
  customBackground: File | null;
  promptValue: string;
  onPromptChange: (value: string) => void;
}

type PickerMode = "custom" | "preset";

const BackgroundPicker = ({
  onCustomUpload,
  onPresetSelect,
  selectedPreset,
  customBackground,
  promptValue,
  onPromptChange
}: BackgroundPickerProps) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<PickerMode>("preset");
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  };

  const handleModeChange = (newMode: PickerMode) => {
    setMode(newMode);
  };

  const hasSelection = selectedPreset !== null || customBackground !== null;

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === "custom" ? "default" : "outline"}
          onClick={() => handleModeChange("custom")}
          className="flex-1 gap-2"
        >
          <Upload className="h-4 w-4" />
          {t("bulkBackground.selectBackground.uploadCustom")}
        </Button>
        <Button
          variant={mode === "preset" ? "default" : "outline"}
          onClick={() => handleModeChange("preset")}
          className="flex-1 gap-2"
        >
          <Grid3X3 className="h-4 w-4" />
          {t("bulkBackground.selectBackground.choosePreset")}
        </Button>
      </div>

      {/* Custom Upload */}
      {mode === "custom" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("bulkBackground.selectBackground.uploadHint")}
          </p>

          {customPreview ? (
            <Card className="relative overflow-hidden bg-transparent">
              <img
                src={customPreview}
                alt="Custom background"
                className="w-full h-full object-cover"
              />
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
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              </div>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Preset Selection */}
      {mode === "preset" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("bulkBackground.selectBackground.presetHint")}
          </p>
          <BackgroundPresets
            selectedPreset={selectedPreset}
            onSelect={handlePresetSelect}
          />
        </div>
      )}

      {/* Editable Prompt Field */}
      {hasSelection && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium text-foreground">
              Prompt
            </label>
          </div>
          <Textarea
            value={promptValue}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Describe how you want the product placed on this background..."
            className="min-h-[80px] rounded-apple-sm text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Edit the prompt to customize how your product is placed on the background.
          </p>
        </div>
      )}
    </div>
  );
};

export default BackgroundPicker;
