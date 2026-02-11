import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pencil, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";

interface EcommerceIdea {
  title: string;
  description: string;
}

interface EcommerceIdeasModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSelectIdea: (idea: string) => void;
}

export const EcommerceIdeasModal = ({
  isOpen,
  onClose,
  imageUrl,
  onSelectIdea,
}: EcommerceIdeasModalProps) => {
  const { t } = useTranslation();
  const [ideas, setIdeas] = useState<EcommerceIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customDescription, setCustomDescription] = useState('');
  const [enhancing, setEnhancing] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  useEffect(() => {
    if (isOpen && imageUrl) {
      generateIdeas();
    }
  }, [isOpen, imageUrl]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCustomMode(false);
      setCustomDescription('');
      setSelectedIdea(null);
    }
  }, [isOpen]);

  const generateIdeas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("outfit-swap", {
        body: {
          action: "generateEcommerceIdeas",
          imageUrl,
          language
        },
      });

      if (error) throw error;

      if (data?.ideas && Array.isArray(data.ideas)) {
        setIdeas(data.ideas);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error: any) {
      console.error("Failed to generate ideas:", error);
      toast({
        variant: "destructive",
        title: t('ecommerceIdeasModal.failedToGenerate'),
        description: error.message || t('ecommerceIdeasModal.pleaseTryAgain'),
      });
      // Set fallback ideas
      setIdeas([
        {
          title: t('ecommerceIdeasModal.fallbackIdeas.cleanStudio.title'),
          description: t('ecommerceIdeasModal.fallbackIdeas.cleanStudio.description'),
        },
        {
          title: t('ecommerceIdeasModal.fallbackIdeas.lifestyleContext.title'),
          description: t('ecommerceIdeasModal.fallbackIdeas.lifestyleContext.description'),
        },
        {
          title: t('ecommerceIdeasModal.fallbackIdeas.editorialMagazine.title'),
          description: t('ecommerceIdeasModal.fallbackIdeas.editorialMagazine.description'),
        },
        {
          title: t('ecommerceIdeasModal.fallbackIdeas.streetUrban.title'),
          description: t('ecommerceIdeasModal.fallbackIdeas.streetUrban.description'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const enhancePrompt = async () => {
    if (!customDescription.trim()) return;
    
    setEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("outfit-swap", {
        body: {
          action: "enhanceScenarioPrompt",
          userPrompt: customDescription,
          imageUrl,
          language
        },
      });

      if (error) throw error;

      if (data?.enhancedPrompt) {
        setCustomDescription(data.enhancedPrompt);
        toast({
          title: t('ecommerceIdeasModal.promptEnhanced'),
          description: t('ecommerceIdeasModal.promptEnhancedDesc'),
        });
      }
    } catch (error: any) {
      console.error("Failed to enhance prompt:", error);
      toast({
        variant: "destructive",
        title: t('ecommerceIdeasModal.enhanceFailed'),
        description: error.message || t('ecommerceIdeasModal.pleaseTryAgain'),
      });
    } finally {
      setEnhancing(false);
    }
  };

  const handleSelect = () => {
    if (customMode && customDescription.trim()) {
      onSelectIdea(customDescription);
    } else if (selectedIdea) {
      onSelectIdea(selectedIdea);
    }
  };

  const canGenerate = customMode 
    ? customDescription.trim().length > 0 
    : selectedIdea !== null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-full">
        <DialogHeader>
          <DialogTitle>{t('ecommerceIdeasModal.title')}</DialogTitle>
          <DialogDescription>
            {t('ecommerceIdeasModal.description')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Custom Scenario Input */}
            <div
              className={cn(
                "border rounded-lg transition-all",
                customMode
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 cursor-pointer"
              )}
            >
              <div
                className="p-4 flex items-center gap-3"
                onClick={() => {
                  setCustomMode(!customMode);
                  if (!customMode) {
                    setSelectedIdea(null);
                  }
                }}
              >
                <div className={cn(
                  "p-2 rounded-full",
                  customMode ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Pencil className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-base">{t('ecommerceIdeasModal.customScenario')}</h4>
                  <p className="text-sm text-muted-foreground">{t('ecommerceIdeasModal.customScenarioDesc')}</p>
                </div>
                {customMode && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                    {t('ecommerceIdeasModal.active')}
                  </span>
                )}
              </div>
              
              {customMode && (
                <div className="px-4 pb-4 space-y-3">
                  <Textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder={t('ecommerceIdeasModal.customPlaceholder')}
                    className="min-h-[100px] resize-none"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={enhancePrompt}
                    disabled={enhancing || !customDescription.trim()}
                    className="gap-2"
                  >
                    {enhancing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {enhancing 
                      ? t('ecommerceIdeasModal.enhancing') 
                      : t('ecommerceIdeasModal.enhancePrompt')
                    }
                  </Button>
                </div>
              )}
            </div>

            {/* Divider */}
            {!customMode && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex-1 h-px bg-border" />
                <span>{t('ecommerceIdeasModal.orChooseSuggestion')}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            {/* AI Generated Ideas */}
            {!customMode && (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {ideas.map((idea, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                      selectedIdea === idea.title
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => setSelectedIdea(idea.title)}
                  >
                    <h4 className="font-semibold text-base mb-1">{idea.title}</h4>
                    <p className="text-sm text-muted-foreground">{idea.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t('ecommerceIdeasModal.cancel')}
          </Button>
          <Button onClick={handleSelect} disabled={!canGenerate || loading}>
            {t('ecommerceIdeasModal.generateWithStyle')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
