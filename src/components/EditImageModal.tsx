import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Download, RotateCcw, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface EditVersion {
  id: string;
  public_url: string;
  created_at: string;
}

interface EditImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageId?: string;
  onEditComplete?: (newImageUrl: string) => void;
}

export default function EditImageModal({
  isOpen,
  onClose,
  imageUrl,
  imageId,
  onEditComplete,
}: EditImageModalProps) {
  const { t } = useTranslation();
  const [instruction, setInstruction] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
  const [editHistory, setEditHistory] = useState<EditVersion[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInstruction("");
      setResultUrl(null);
      setCurrentImageUrl(imageUrl);
      fetchEditHistory(imageUrl);
    }
  }, [isOpen, imageUrl]);

  const fetchEditHistory = async (url: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('ugc_images')
        .select('id, public_url, created_at')
        .filter('meta->>source', 'eq', 'edit')
        .filter('meta->>original_image_url', 'eq', url)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setEditHistory(data as EditVersion[]);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async () => {
    if (!instruction.trim()) {
      toast({
        title: t("editImage.instructionRequired"),
        description: t("editImage.instructionRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: {
          imageUrl: currentImageUrl,
          maskBase64: null,
          instruction: instruction.trim(),
          originalImageId: imageId || null,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Edit failed");

      setResultUrl(data.imageUrl);
      onEditComplete?.(data.imageUrl);
      fetchEditHistory(imageUrl);
      toast({ title: t("editImage.success"), description: t("editImage.successDesc") });
    } catch (err: any) {
      console.error("Edit image error:", err);
      toast({
        title: t("editImage.failed"),
        description: err.message || t("editImage.failedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenResult = () => {
    if (!resultUrl) return;
    window.open(resultUrl, "_blank", "noopener");
  };

  const handleSelectVersion = (version: EditVersion) => {
    setCurrentImageUrl(version.public_url);
    setResultUrl(null);
    setInstruction("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editImage.title")}</DialogTitle>
          <DialogDescription>
            {t("editImage.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image preview */}
          <div className="flex justify-center rounded-lg overflow-hidden border border-border bg-muted/20">
            <img
              src={resultUrl || currentImageUrl}
              alt={t("editImage.imageAlt")}
              className="max-w-full max-h-[50vh] block object-contain"
              draggable={false}
            />
          </div>

          {/* Result actions */}
          {resultUrl && (
            <div className="flex gap-2">
              <Button onClick={handleOpenResult} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                {t("editImage.openResult")}
              </Button>
              <Button
                onClick={() => { setResultUrl(null); setInstruction(""); }}
                variant="ghost"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t("editImage.editAgain")}
              </Button>
            </div>
          )}

          {/* Instruction input */}
          {!resultUrl && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-instruction">{t("editImage.instructionLabel")}</Label>
                <Textarea
                  id="edit-instruction"
                  placeholder={t("editImage.instructionPlaceholder")}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !instruction.trim()}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("editImage.editing")}
                  </>
                ) : (
                  t("editImage.applyEdit")
                )}
              </Button>
            </>
          )}

          {/* Edit History Strip */}
          {editHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <History className="h-4 w-4" />
                <span>{t("editImage.historyTitle", { count: editHistory.length })}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {editHistory.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => handleSelectVersion(version)}
                    className={`shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                      currentImageUrl === version.public_url
                        ? 'border-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={version.public_url}
                      alt="Edit version"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
