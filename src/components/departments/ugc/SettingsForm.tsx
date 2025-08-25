import React from "react";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Progress } from "@/components/ui/progress";
import OrientationSelector from "@/components/OrientationSelector";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

export interface GenerationSettings {
  numImages: number;
  style: 'lifestyle' | 'studio' | 'editorial' | 'natural';
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

function labelTime(v: "natural" | "golden" | "night") {
  return v === "natural" ? "Natural" : v === "golden" ? "Golden" : "Night";
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

  const usagePercentage = (remainingCredits / totalCredits) * 100;
  const creditsNeeded = calculateImageCost(settings.imageQuality, settings.numImages);

  return (
    <div className="space-y-4">
      {/* Credits Overview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Créditos</span>
          <span>{remainingCredits} de {totalCredits}</span>
        </div>
        <Progress value={usagePercentage} className="h-2" />
        <div className="text-xs text-muted-foreground text-center">
          Esta geração: {creditsNeeded} crédito{creditsNeeded !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Number of Images */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Número de Imagens</Label>
        <ToggleGroup 
          type="single" 
          value={settings.numImages.toString()} 
          onValueChange={(value) => value && onSettingsChange({ numImages: parseInt(value) })}
          className="justify-start"
        >
          <ToggleGroupItem value="1" size="sm" className="flex-1 bg-muted">1</ToggleGroupItem>
          <ToggleGroupItem value="2" size="sm" className="flex-1 bg-muted">2</ToggleGroupItem>
          <ToggleGroupItem value="3" size="sm" className="flex-1 bg-muted">3</ToggleGroupItem>
        </ToggleGroup>
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
          onValueChange={(value) => value && onSettingsChange({ style: value as GenerationSettings['style'] })}
          className="justify-start grid grid-cols-4 gap-1"
        >
          {(["lifestyle", "studio", "editorial", "natural"] as const).map((s) => (
            <ToggleGroupItem key={s} value={s} size="sm" className="text-xs px-2 py-1 bg-muted">
              {capitalize(s)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
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
          {["1:1", "2:3", "3:2"].map((o) => (
            <ToggleGroupItem key={o} value={o} size="sm" className="text-xs px-2 py-1 bg-muted">
              {o}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Image Quality */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Qualidade</Label>
          <TooltipProvider>
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
          </TooltipProvider>
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