import { useTranslation } from "react-i18next";
import { Trash2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCustomAudiences } from "@/hooks/useCustomAudiences";

interface SavedAudiencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (audience: string) => void;
}

export function SavedAudiencesModal({ open, onOpenChange, onSelect }: SavedAudiencesModalProps) {
  const { t } = useTranslation();
  const { audiences, isLoading, deleteAudience } = useCustomAudiences();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('ugc.savedAudiences.title')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {t('ugc.savedAudiences.loading')}
            </div>
          ) : audiences.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {t('ugc.savedAudiences.empty')}
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {audiences.map((a) => (
                <div
                  key={a.id}
                  className="group relative p-3 border border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                  onClick={() => {
                    onSelect(a.audience);
                    onOpenChange(false);
                  }}
                >
                  <p className="text-sm font-medium truncate pr-8">{a.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.audience}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAudience(a.id);
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
