import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles } from "lucide-react";

interface ModelPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  imageUrl: string;
  metadata: {
    name: string;
    gender?: string;
    age_range?: string;
    body_type?: string;
    skin_tone?: string;
    pose_type?: string;
  };
  creditsDeducted: number;
  isGeneratedWithAI?: boolean;
  isSaving?: boolean;
}

export const ModelPreviewDialog = ({
  isOpen,
  onClose,
  onConfirm,
  imageUrl,
  metadata,
  creditsDeducted,
  isGeneratedWithAI = false,
  isSaving = false,
}: ModelPreviewDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isGeneratedWithAI && <Sparkles className="w-5 h-5 text-primary" />}
            Preview Your Model
          </DialogTitle>
          <DialogDescription>
            Review your model before saving. Credits will be deducted when you save.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview */}
          <div className="aspect-[3/4] max-h-[500px] relative overflow-hidden rounded-lg bg-muted">
            <img
              src={imageUrl}
              alt={metadata.name}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Metadata */}
          <div className="space-y-3">
            <div>
              <span className="font-semibold">Model Name: </span>
              <span>{metadata.name}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {metadata.gender && (
                <Badge variant="outline">{metadata.gender}</Badge>
              )}
              {metadata.age_range && (
                <Badge variant="outline">{metadata.age_range}</Badge>
              )}
              {metadata.body_type && (
                <Badge variant="outline">{metadata.body_type}</Badge>
              )}
              {metadata.skin_tone && (
                <Badge variant="outline">{metadata.skin_tone}</Badge>
              )}
              {metadata.pose_type && (
                <Badge variant="outline">{metadata.pose_type}</Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isSaving}
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Model
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
