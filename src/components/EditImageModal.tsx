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
        title: "Instrução necessária",
        description: "Descreve as alterações que queres fazer.",
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
      // Refresh history to include the new edit
      fetchEditHistory(imageUrl);
      toast({ title: "Imagem editada!", description: "A tua imagem editada está pronta." });
    } catch (err: any) {
      console.error("Edit image error:", err);
      toast({
        title: "Edição falhou",
        description: err.message || "Algo correu mal. Tenta novamente.",
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
          <DialogTitle>Editar Imagem</DialogTitle>
          <DialogDescription>
            Descreve as alterações que queres fazer à imagem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image preview */}
          <div className="flex justify-center rounded-lg overflow-hidden border border-border bg-muted/20">
            <img
              src={resultUrl || currentImageUrl}
              alt="Imagem a editar"
              className="max-w-full max-h-[50vh] block object-contain"
              draggable={false}
            />
          </div>

          {/* Result actions */}
          {resultUrl && (
            <div className="flex gap-2">
              <Button onClick={handleOpenResult} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Abrir Resultado
              </Button>
              <Button
                onClick={() => { setResultUrl(null); setInstruction(""); }}
                variant="ghost"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Editar Novamente
              </Button>
            </div>
          )}

          {/* Instruction input */}
          {!resultUrl && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-instruction">Instrução de edição</Label>
                <Textarea
                  id="edit-instruction"
                  placeholder="Ex: Muda o fundo para uma praia ao pôr do sol, remove o logótipo, coloca a camisola vermelha..."
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
                    A editar...
                  </>
                ) : (
                  "Aplicar Edição (1 crédito)"
                )}
              </Button>
            </>
          )}

          {/* Edit History Strip */}
          {editHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <History className="h-4 w-4" />
                <span>Histórico de edições ({editHistory.length})</span>
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
