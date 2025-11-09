import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
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
  const { toast } = useToast();

  const { language } = useLanguage();

  useEffect(() => {
    if (isOpen && imageUrl) {
      generateIdeas();
    }
  }, [isOpen, imageUrl]);

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

  const handleSelect = () => {
    if (selectedIdea) {
      onSelectIdea(selectedIdea);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
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
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
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

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t('ecommerceIdeasModal.cancel')}
          </Button>
          <Button onClick={handleSelect} disabled={!selectedIdea || loading}>
            {t('ecommerceIdeasModal.generateWithStyle')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
