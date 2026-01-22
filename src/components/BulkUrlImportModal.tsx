import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Link, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BulkUrlImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: (importedIds: string[]) => void;
  maxImages?: number;
  currentCount?: number;
}

interface ImportStatus {
  url: string;
  status: 'pending' | 'importing' | 'success' | 'error';
  error?: string;
  imageId?: string;
}

export const BulkUrlImportModal = ({
  open,
  onClose,
  onImportComplete,
  maxImages = 10,
  currentCount = 0,
}: BulkUrlImportModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [urlInput, setUrlInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [importStatuses, setImportStatuses] = useState<ImportStatus[]>([]);

  const remainingSlots = maxImages - currentCount;

  const parseUrls = (input: string): string[] => {
    return input
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter((url) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      })
      .slice(0, remainingSlots);
  };

  const validUrls = parseUrls(urlInput);

  const handleImport = async () => {
    if (validUrls.length === 0) return;

    setImporting(true);
    const statuses: ImportStatus[] = validUrls.map((url) => ({
      url,
      status: 'pending',
    }));
    setImportStatuses(statuses);

    const importedIds: string[] = [];
    const batchSize = 3;

    for (let i = 0; i < validUrls.length; i += batchSize) {
      const batch = validUrls.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (url, batchIndex) => {
          const index = i + batchIndex;

          // Update to importing
          setImportStatuses((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], status: 'importing' };
            return updated;
          });

          try {
            const { data, error } = await supabase.functions.invoke('upload-source-image-from-url', {
              body: { imageUrl: url },
            });

            if (error || !data?.success) {
              throw new Error(data?.error || error?.message || 'Upload failed');
            }

            importedIds.push(data.id);

            setImportStatuses((prev) => {
              const updated = [...prev];
              updated[index] = { ...updated[index], status: 'success', imageId: data.id };
              return updated;
            });
          } catch (err: any) {
            setImportStatuses((prev) => {
              const updated = [...prev];
              updated[index] = { ...updated[index], status: 'error', error: err.message };
              return updated;
            });
          }
        })
      );
    }

    setImporting(false);

    if (importedIds.length > 0) {
      toast({
        title: t('outfitSwap.garmentUploader.importSuccess', 'Import Complete'),
        description: t('outfitSwap.garmentUploader.importSuccessDesc', '{{count}} images imported successfully', {
          count: importedIds.length,
        }),
      });
      onImportComplete(importedIds);
    }
  };

  const handleClose = () => {
    if (!importing) {
      setUrlInput("");
      setImportStatuses([]);
      onClose();
    }
  };

  const completedCount = importStatuses.filter((s) => s.status === 'success').length;
  const errorCount = importStatuses.filter((s) => s.status === 'error').length;
  const progress = importStatuses.length > 0
    ? ((completedCount + errorCount) / importStatuses.length) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            {t('outfitSwap.garmentUploader.importFromUrl', 'Import from URL')}
          </DialogTitle>
          <DialogDescription>
            {t('outfitSwap.garmentUploader.urlDescription', 'Paste image URLs (one per line). Maximum {{max}} images.', {
              max: remainingSlots,
            })}
          </DialogDescription>
        </DialogHeader>

        {importStatuses.length === 0 ? (
          <>
            <Textarea
              placeholder={t('outfitSwap.garmentUploader.urlPlaceholder', 'https://example.com/image1.jpg\nhttps://example.com/image2.jpg')}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
            <div className="text-sm text-muted-foreground flex items-center gap-2">
        {validUrls.length > 0 ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {t('outfitSwap.garmentUploader.validUrlsCount', '{{count}} valid URLs detected', {
              count: validUrls.length,
            })}
          </>
        ) : urlInput.trim() ? (
          <>
            <AlertCircle className="w-4 h-4 text-amber-500" />
                  {t('outfitSwap.garmentUploader.noValidUrls', 'No valid URLs detected')}
                </>
              ) : null}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />
            <div className="text-sm text-center text-muted-foreground">
              {completedCount + errorCount} / {importStatuses.length}
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {importStatuses.map((status, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
                >
                  {status.status === 'pending' && (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                  )}
                  {status.status === 'importing' && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                  {status.status === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  {status.status === 'error' && (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span className="truncate flex-1 font-mono text-xs">
                    {status.url}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            {importing ? t('common.close', 'Close') : t('common.cancel', 'Cancel')}
          </Button>
          {importStatuses.length === 0 && (
            <Button onClick={handleImport} disabled={validUrls.length === 0 || importing}>
              {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('outfitSwap.garmentUploader.importUrls', 'Import {{count}} URLs', {
                count: validUrls.length,
              })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
