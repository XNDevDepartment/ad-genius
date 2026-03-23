import React from "react";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Progress } from "@/components/ui/progress";
import AspectRatioSelector, { AspectRatio } from "@/components/AspectRatioSelector";
import { Lock, Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCredits } from "@/hooks/useCredits";

export interface GenerationSettings {
  numImages: number;
  style: 'lifestyle' | 'studio' | 'cinematic' | 'natural' | 'minimal' | 'professional';
  timeOfDay: 'natural' | 'golden' | 'night' | 'morning';
  highlight: string;
  imageOrientation: string;
  imageQuality: 'low' | 'medium' | 'high';
  aspectRatio?: AspectRatio;
  outputFormat?: 'png' | 'webp';
  imageSize?: '1K' | '2K' | '4K';
}

interface SettingsFormProps {
  settings: GenerationSettings;
  onSettingsChange: (settings: Partial<GenerationSettings>) => void;
  remainingCredits: number;
  totalCredits: number;
  calculateImageCost: (quality: 'low' | 'medium' | 'high', count: number, imageSize?: '1K' | '2K' | '4K') => number;
  compact?: boolean;
}

export const SettingsForm = ({
  settings,
  onSettingsChange,
  remainingCredits,
  totalCredits,
  calculateImageCost,
  compact = false
}: SettingsFormProps) => {
  const { t } = useTranslation();
  const { isFreeTier, getMaxImagesPerGeneration } = useCredits();

  const usagePercentage = (remainingCredits / totalCredits) * 100;
  const creditsNeeded = calculateImageCost(settings.imageQuality, settings.numImages, settings.imageSize || '1K');
  const maxImages = 3;

  const freeScenarios = ['lifestyle', 'minimal', 'vibrant', 'professional'];
  const premiumScenarios = ['cinematic', 'natural'];

  // Default aspect ratio to 1:1 if not set
  const currentAspectRatio = settings.aspectRatio || '1:1';

  return (
    <div className="space-y-4">
      {/* Credits Overview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('ugc.credits')}</span>
          <span>{remainingCredits} {t('common.of')} {totalCredits}</span>
        </div>
        <Progress value={usagePercentage} className="h-2" />
        <div className="text-xs text-muted-foreground text-center">
          {t('ugc.thisGeneration')}: {t('ugc.credits', { count: creditsNeeded })}
        </div>
      </div>

      {/* Number of Images */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('ugc.numImages.title')}</Label>
        <ToggleGroup
          type="single"
          value={settings.numImages.toString()}
          onValueChange={(value) => {
            if (value) {
              const numImages = parseInt(value);
              if (numImages <= maxImages) {
                onSettingsChange({ numImages });
              }
            }
          }}
          className="justify-start"
        >
          <ToggleGroupItem value="1" size="sm" className="flex-1 bg-muted">1</ToggleGroupItem>
          <ToggleGroupItem
            value="2"
            size="sm"
            className={`flex-1 bg-muted ${maxImages < 2 ? 'opacity-50' : ''}`}
            disabled={maxImages < 2}
          >
            2 {maxImages < 2 && <Lock className="h-3 w-3 ml-1" />}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="3"
            size="sm"
            className={`flex-1 bg-muted ${maxImages < 3 ? 'opacity-50' : ''}`}
            disabled={maxImages < 3}
          >
            3 {maxImages < 3 && <Lock className="h-3 w-3 ml-1" />}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Highlight Product */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('ugc.highlight.title')}</Label>
        <ToggleGroup 
          type="single" 
          value={settings.highlight} 
          onValueChange={(value) => value && onSettingsChange({ highlight: value })}
          className="justify-start"
        >
          <ToggleGroupItem value="no" size="sm" className="flex-1 bg-muted">{t('ugc.highlight.yes')}</ToggleGroupItem>
          <ToggleGroupItem value="yes" size="sm" className="flex-1 bg-muted">{t('ugc.highlight.no')}</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Style */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('ugc.style.title')}</Label>
        <ToggleGroup 
          type="single" 
          value={settings.style} 
          onValueChange={(value) => {
            if (value) {
              onSettingsChange({ style: value as GenerationSettings['style'] });
            }
          }}
          className="justify-start grid grid-cols-3 gap-1"
        >
          {freeScenarios.map((s) => (
            <ToggleGroupItem key={s} value={s} size="sm" className="text-xs px-2 py-1 bg-muted">
              {t(`ugc.style.${s}`)}
            </ToggleGroupItem>
          ))}
          {premiumScenarios.map((s) => (
            <ToggleGroupItem
              key={s}
              value={s}
              size="sm"
              className='text-xs px-2 py-1 bg-muted relative'
            >
              {t(`ugc.style.${s}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Time of Day */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('ugc.lighting.title')}</Label>
        <ToggleGroup 
          type="single" 
          value={settings.timeOfDay} 
          onValueChange={(value) => value && onSettingsChange({ timeOfDay: value as GenerationSettings['timeOfDay'] })}
          className="justify-start grid grid-cols-2 gap-1"
        >
          <ToggleGroupItem value="natural" size="sm" className="text-xs px-2 py-1 bg-muted">{t('ugc.advancedSettings.timeOfDay.natural')}</ToggleGroupItem>
          <ToggleGroupItem value="morning" size="sm" className="text-xs px-2 py-1 bg-muted">{t('ugc.advancedSettings.timeOfDay.soft')}</ToggleGroupItem>
          <ToggleGroupItem value="golden" size="sm" className="text-xs px-2 py-1 bg-muted">{t('ugc.advancedSettings.timeOfDay.golden')}</ToggleGroupItem>
          <ToggleGroupItem value="night" size="sm" className="text-xs px-2 py-1 bg-muted">{t('ugc.advancedSettings.timeOfDay.night')}</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Aspect Ratio - Using consistent AspectRatioSelector component */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('ugc.orientation.title')}</Label>
        <AspectRatioSelector
          value={currentAspectRatio as AspectRatio}
          onChange={(value) => onSettingsChange({ aspectRatio: value, imageOrientation: value })}
          lockedRatios={isFreeTier() ? (['9:16', '4:5'] as AspectRatio[]) : []}
        />
      </div>

      {/* Resolution */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('bulkBackground.settings.imageSize')}</Label>
        <ToggleGroup
          type="single"
          value={settings.imageSize || '1K'}
          onValueChange={(v) => {
            if (v && !(isFreeTier() && (v === '2K' || v === '4K'))) {
              onSettingsChange({ imageSize: v as '1K' | '2K' | '4K' });
            }
          }}
          className="justify-start"
        >
          {(['1K', '2K', '4K'] as const).map((size) => {
            const locked = isFreeTier() && (size === '2K' || size === '4K');
            return (
              <ToggleGroupItem key={size} value={size} size="sm" className={`flex-1 bg-muted ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
                {size}
                {locked && <Crown className="h-3 w-3 ml-1 text-primary" />}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

    </div>
  );
};
