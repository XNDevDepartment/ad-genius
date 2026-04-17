import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCollections } from '@/hooks/useCollections';
import { useCollectionItems } from '@/hooks/useCollectionItems';
import { CreateCollectionDialog } from './CreateCollectionDialog';
import { useToast } from '@/hooks/use-toast';

interface BulkAddToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: { id: string; type: string }[];
  onAdded?: () => void;
}

export const BulkAddToCollectionDialog = ({
  open,
  onOpenChange,
  items,
  onAdded,
}: BulkAddToCollectionDialogProps) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { collections, isLoading, createCollection } = useCollections();
  const { addItems } = useCollectionItems();
  const { toast } = useToast();

  const handleAdd = async (collectionId: string, collectionName: string) => {
    setBusyId(collectionId);
    try {
      await addItems(items, collectionId);
      toast({ title: `Added ${items.length} image${items.length !== 1 ? 's' : ''} to "${collectionName}"` });
      onAdded?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Failed to add to collection',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (input: { name: string; emoji: string; color: string }) => {
    const newCollection = await createCollection(input);
    setCreateOpen(false);
    await handleAdd(newCollection.id, newCollection.name);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add {items.length} image{items.length !== 1 ? 's' : ''} to Collection</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {collections.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No collections yet.</p>
              ) : (
                collections.map(col => (
                  <button
                    key={col.id}
                    onClick={() => handleAdd(col.id, col.name)}
                    disabled={busyId !== null}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left disabled:opacity-50"
                  >
                    <span className="text-xl">{col.emoji}</span>
                    <span className="flex-1 text-sm font-medium">{col.name}</span>
                    {busyId === col.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </button>
                ))
              )}
            </div>
          )}
          <button
            onClick={() => { onOpenChange(false); setCreateOpen(true); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-sm text-muted-foreground border border-dashed border-border/60"
          >
            <Plus className="h-4 w-4" />
            New collection...
          </button>
        </DialogContent>
      </Dialog>

      <CreateCollectionDialog
        onCreate={handleCreate}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
};
