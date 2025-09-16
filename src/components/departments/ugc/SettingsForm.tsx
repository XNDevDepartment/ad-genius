
import React from "react";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Progress } from "@/components/ui/progress";
import OrientationSelector from "@/components/OrientationSelector";
import { HelpCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { useCredits } from "@/hooks/useCredits";

export interface GenerationSettings {
  numImages: number;
  style: 'lifestyle' | 'studio' | 'cinematic' | 'natural' | 'minimal' | 'professional';
  timeOfDay: 'natural' | 'golden' | 'night' | 'morning';
  highlight: string;
  imageOrientation: string;
  imageQuality: 'low' | 'medium' | 'high';
}

interface SettingsFormProps {
  settings: GenerationSettings;
  onSettingsChange: (settings: Partial<GenerationSettings>) => void;
  remainingCredits: number;
  totalCredits: number;
  calculateImageCost: (quality: 'low' | 'medium' | 'high', count: number) => number;
  compact?: boolean;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  const creditsNeeded = calculateImageCost(settings.imageQuality, settings.numImages);
  // const maxImages = getMaxImagesPerGeneration();
  const maxImages = 3;

  const freeScenarios = ['lifestyle', 'minimal', 'vibrant', 'professional'];
  const premiumScenarios = ['cinematic', 'natural'];

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
        {/* {isFreeTier() && (
          <div className="text-xs text-muted-foreground">
            {t('ugc.freePlanLimited')}
            <Button
              variant="link"
              className="h-auto p-0 text-xs text-primary"
              onClick={() => window.location.href = '/pricing'}
            >
              {t('common.upgradeForMore')}
            </Button>
          </div>
        )} */}
      </div>

      {/* Highlight Product */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Destacar Produto</Label>
        <ToggleGroup 
          type="single" 
          value={settings.highlight} 
          onValueChange={(value) => value && onSettingsChange({ highlight: value })}
          className="justify-start"
        >
          <ToggleGroupItem value="yes" size="sm" className="flex-1 text-xs bg-muted">Sim</ToggleGroupItem>
          <ToggleGroupItem value="no" size="sm" className="flex-1 text-xs bg-muted">Não</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Style */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Estilo</Label>
        <ToggleGroup 
          type="single" 
          value={settings.style} 
          onValueChange={(value) => {
            if (value) {
              // Check if it's a premium scenario and user is on free tier
              // if (isFreeTier() && premiumScenarios.includes(value)) {
              //   return; // Don't allow selection
              // }
              onSettingsChange({ style: value as GenerationSettings['style'] });
            }
          }}
          className="justify-start grid grid-cols-3 gap-1"
        >
          {freeScenarios.map((s) => (
            <ToggleGroupItem key={s} value={s} size="sm" className="text-xs px-2 py-1 bg-muted">
              {capitalize(s)}
            </ToggleGroupItem>
          ))}
          {premiumScenarios.map((s) => (
            <ToggleGroupItem
              key={s}
              value={s}
              size="sm"
              // className={`text-xs px-2 py-1 bg-muted relative ${isFreeTier() ? 'opacity-50' : ''}`}
              className='text-xs px-2 py-1 bg-muted relative'
              // disabled={isFreeTier()}
            >
              {capitalize(s)}
              {/* {isFreeTier() && <Lock className="h-3 w-3 ml-1" />} */}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {/* {isFreeTier() && (
          <div className="text-xs text-muted-foreground">
            2 premium scenarios available with paid plans. 
            <Button 
              variant="link" 
              className="h-auto p-0 text-xs text-primary"
              onClick={() => window.location.href = '/pricing'}
            >
              Upgrade to unlock
            </Button>
          </div>
        )} */}
      </div>

      {/* Time of Day */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tipo de Luz</Label>
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

      {/* Orientation */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Orientação</Label>
        <ToggleGroup 
          type="single" 
          value={settings.imageOrientation} 
          onValueChange={(value) => value && onSettingsChange({ imageOrientation: value })}
          className="justify-start grid grid-cols-3 gap-1"
        >
          {[
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
          ].map((o) => (
            <ToggleGroupItem key={o.value} value={o.value} size="sm" className="text-xs px-2 py-1 bg-muted">
              <div className={`bg-transparent border ${o.value === settings.imageOrientation ? 'border-white-500' : 'border-gray-500' } ${o.iconWidth} ${o.iconHeight}`} />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Image Quality */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Qualidade</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-3 w-3 p-0">
                <HelpCircle className="h-2 w-2 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">Higher quality uses more credits but produces better results</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <ToggleGroup 
          type="single" 
          value={settings.imageQuality} 
          onValueChange={(value) => value && onSettingsChange({ imageQuality: value as 'low' | 'medium' | 'high' })}
          className="justify-start grid grid-cols-3 gap-1"
        >
          <ToggleGroupItem value="low" className="text-xs px-2 py-1 flex flex-col items-center bg-muted">
            <span>Baixa</span>
            <span className="text-[10px] opacity-70">1 crédito</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="medium" className="text-xs px-2 py-1 flex flex-col items-center bg-muted">
            <span>Média</span>
            <span className="text-[10px] opacity-70">1.5 créditos</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="high" className="text-xs px-2 py-1 flex flex-col items-center bg-muted">
            <span>Alta</span>
            <span className="text-[10px] opacity-70">2 créditos</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
};
