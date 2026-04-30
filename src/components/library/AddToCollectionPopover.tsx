import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCollections } from '@/hooks/useCollections';
import { useCollectionItems } from '@/hooks/useCollectionItems';
import { CreateCollectionDialog } from './CreateCollectionDialog';
import { useToast } from '@/hooks/use-toast';

interface AddToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  contentType: string;
}

export const AddToCollectionDialog = ({
  open,
  onOpenChange,
  contentId,
  contentType,
}: AddToCollectionDialogProps) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const { collections, isLoading, createCollection } = useCollections();
  const { addItem, removeItem } = useCollectionItems();
  const { toast } = useToast();

  const handleToggle = async (collectionId: string) => {
    const isMember = memberIds.has(collectionId);
    try {
      if (isMember) {
        await removeItem(contentId, collectionId);
        setMemberIds(prev => { const s = new Set(prev); s.delete(collectionId); return s; });
      } else {
        await addItem(contentId, contentType, collectionId);
        setMemberIds(prev => new Set([...prev, collectionId]));
        toast({ title: `Added to collection` });
      }
    } catch {
      toast({ title: 'Failed to update collection', variant: 'destructive' });
    }
  };

  const handleCreate = async (input: { name: string; emoji: string; color: string }) => {
    try {
      const newCollection = await createCollection(input);
      await addItem(contentId, contentType, newCollection.id);
      setMemberIds(prev => new Set([...prev, newCollection.id]));
      setCreateOpen(false);
      toast({ title: `Added to "${newCollection.name}"` });
    } catch {
      toast({ title: 'Failed to create collection', variant: 'destructive' });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add to Collection</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {collections.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No collections yet.</p>
              ) : (
                collections.map(col => {
                  const isMember = memberIds.has(col.id);
                  return (
                    <button
                      key={col.id}
                      onClick={() => handleToggle(col.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
                    >
                      <span className="text-xl">{col.emoji}</span>
                      <span className="flex-1 text-sm font-medium">{col.name}</span>
                      {isMember && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </button>
                  );
                })
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
