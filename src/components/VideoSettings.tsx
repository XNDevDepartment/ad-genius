import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export interface VideoSettings {
  cameraMovement: 'none' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down';
  motionIntensity: 'subtle' | 'moderate' | 'dynamic';
  animationStyle: 'natural' | 'cinematic' | 'smooth';
}

interface VideoSettingsProps {
  settings: VideoSettings;
  onSettingsChange: (settings: VideoSettings) => void;
}

export const VideoSettingsPanel = ({ settings, onSettingsChange }: VideoSettingsProps) => {
  const { t } = useTranslation();

  const updateSetting = (key: keyof VideoSettings, value: string) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          aria-label={t('videoGenerator.settings.label')}
          className="shadow-lg hover:shadow-xl transition-all rounded-lg"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        className="w-72 p-4 space-y-4 bg-background/95 backdrop-blur-md border border-border/50 shadow-xl rounded-xl"
      >
        {/* Camera Movement */}
        <div className="space-y-2">
          <Label>{t('videoGenerator.settings.cameraMovement')}</Label>
          <Select
            value={settings.cameraMovement}
            onValueChange={(value) => updateSetting("cameraMovement", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('videoGenerator.cameraMovements.none')}</SelectItem>
              <SelectItem value="zoom-in">{t('videoGenerator.cameraMovements.zoomIn')}</SelectItem>
              <SelectItem value="zoom-out">{t('videoGenerator.cameraMovements.zoomOut')}</SelectItem>
              <SelectItem value="pan-left">{t('videoGenerator.cameraMovements.panLeft')}</SelectItem>
              <SelectItem value="pan-right">{t('videoGenerator.cameraMovements.panRight')}</SelectItem>
              <SelectItem value="pan-up">{t('videoGenerator.cameraMovements.panUp')}</SelectItem>
              <SelectItem value="pan-down">{t('videoGenerator.cameraMovements.panDown')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Motion Intensity */}
        <div className="space-y-2">
          <Label>{t('videoGenerator.settings.motionIntensity')}</Label>
          <Select
            value={settings.motionIntensity}
            onValueChange={(value) => updateSetting("motionIntensity", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="subtle">{t('videoGenerator.motionIntensities.subtle')}</SelectItem>
              <SelectItem value="moderate">{t('videoGenerator.motionIntensities.moderate')}</SelectItem>
              <SelectItem value="dynamic">{t('videoGenerator.motionIntensities.dynamic')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Animation Style */}
        <div className="space-y-2">
          <Label>{t('videoGenerator.settings.animationStyle')}</Label>
          <Select
            value={settings.animationStyle}
            onValueChange={(value) => updateSetting("animationStyle", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="natural">{t('videoGenerator.animationStyles.natural')}</SelectItem>
              <SelectItem value="cinematic">{t('videoGenerator.animationStyles.cinematic')}</SelectItem>
              <SelectItem value="smooth">{t('videoGenerator.animationStyles.smooth')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
};
