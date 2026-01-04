import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, RefreshCw, Check, Sparkles, Pencil } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { startConversationAPI, converse } from '@/api/OpenAiChatClient';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface AIScenario {
  idea: string;
  description: string;
  'small-description': string;
}

interface OnboardingStep3Props {
  imageUrl?: string;
  sourceImageId?: string;
  audience?: string;
  onNext: (scenario: AIScenario) => void;
}

const ASSISTANT_ID = "asst_zX2cHyZXHY1mj5CT4wzdJLU6";

export const OnboardingStep3 = ({ imageUrl, sourceImageId, audience, onNext }: OnboardingStep3Props) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [aiScenarios, setAiScenarios] = useState<AIScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<AIScenario | null>(null);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);
  const [customScenarioMode, setCustomScenarioMode] = useState(false);
  const [customDescription, setCustomDescription] = useState('');
  const initialized = useRef(false);

  // Initialize thread and generate scenarios
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initAndGenerateScenarios = async () => {
      try {
        // Start conversation thread
        const result = await startConversationAPI(ASSISTANT_ID);
        setThreadId(result.threadId);
        console.log('[Onboarding] Thread created:', result.threadId);

        // Generate scenarios
        await generateScenarios(result.threadId);
      } catch (error) {
        console.error('[Onboarding] Error initializing:', error);
        setIsLoadingScenarios(false);
        toast.error(t('onboarding.step3.error'));
      }
    };

    initAndGenerateScenarios();
  }, []);

  const generateScenarios = async (thread: string) => {
    setIsLoadingScenarios(true);
    setAiScenarios([]);

    try {
      const prompt = `I have a product image. Here is my desired audience: ${audience || 'general consumers'}. Based on this audience, please provide 6 creative UGC scenario ideas. Return ONLY a compact JSON object with "scenarios" array containing objects with "idea", "description", and "small-description" fields. Language: ${language}`;

      const responseText = await converse(thread, prompt, ASSISTANT_ID);

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const scenarios = parsed.scenarios || [];
        setAiScenarios(scenarios);
        console.log('[Onboarding] Scenarios generated:', scenarios.length);
      }
    } catch (error) {
      console.error('[Onboarding] Error generating scenarios:', error);
      toast.error(t('onboarding.step3.error'));
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  const handleRegenerateScenarios = async () => {
    if (!threadId) return;
    await generateScenarios(threadId);
  };

  const handleContinue = () => {
    if (customScenarioMode && customDescription.trim()) {
      onNext({
        idea: 'Custom Scenario',
        description: customDescription.trim(),
        'small-description': customDescription.trim().slice(0, 100)
      });
    } else if (selectedScenario) {
      onNext(selectedScenario);
    }
  };

  const hasValidSelection = customScenarioMode 
    ? customDescription.trim().length > 0 
    : selectedScenario !== null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('onboarding.step3.title')}</h1>
        <p className="text-muted-foreground">{t('onboarding.step3.subtitle')}</p>
      </div>

      {isLoadingScenarios ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{t('onboarding.step3.generating')}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {aiScenarios.map((scenario, index) => {
              const isSelected = !customScenarioMode && selectedScenario?.idea === scenario.idea;
              return (
                <button
                  key={index}
                  onClick={() => {
                    setCustomScenarioMode(false);
                    setSelectedScenario(scenario);
                  }}
                  className={cn(
                    "relative p-4 rounded-xl border-2 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <h3 className="font-semibold mb-1 pr-8">{scenario.idea}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {scenario['small-description'] || scenario.description}
                  </p>
                </button>
              );
            })}

            {/* Custom scenario card */}
            <button
              onClick={() => {
                setCustomScenarioMode(true);
                setSelectedScenario(null);
              }}
              className={cn(
                "relative p-4 rounded-xl border-2 text-left transition-all",
                customScenarioMode
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 border-dashed"
              )}
            >
              {customScenarioMode && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <Pencil className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold">{t('onboarding.step3.customScenario')}</h3>
              </div>
              {customScenarioMode ? (
                <Textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder={t('onboarding.step3.customPlaceholder')}
                  className="mt-2 min-h-[80px] resize-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('onboarding.step3.customDescription')}
                </p>
              )}
            </button>
          </div>

          {/* Regenerate button */}
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateScenarios}
              disabled={isLoadingScenarios}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoadingScenarios && "animate-spin")} />
              {t('onboarding.step3.regenerate')}
            </Button>
          </div>
        </>
      )}

      <Button
        className="w-full mt-8"
        size="lg"
        disabled={!hasValidSelection || isLoadingScenarios}
        onClick={handleContinue}
      >
        {t('onboarding.continue')}
      </Button>
    </div>
  );
};
