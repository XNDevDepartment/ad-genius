import { useTranslation } from "react-i18next";
import { Trash2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCustomScenarios } from "@/hooks/useCustomScenarios";

interface SavedScenariosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (description: string) => void;
}

export function SavedScenariosModal({ open, onOpenChange, onSelect }: SavedScenariosModalProps) {
  const { t } = useTranslation();
  const { scenarios, isLoading, deleteScenario } = useCustomScenarios();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t('ugc.savedScenarios.title')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {t('ugc.savedScenarios.loading')}
            </div>
          ) : scenarios.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {t('ugc.savedScenarios.empty')}
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="group relative p-3 border border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                  onClick={() => {
                    onSelect(scenario.description);
                    onOpenChange(false);
                  }}
                >
                  <p className="text-sm font-medium truncate pr-8">{scenario.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scenario.description}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteScenario(scenario.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
