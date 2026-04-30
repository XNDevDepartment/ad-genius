import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { Collection } from '@/hooks/useCollections';

interface CollectionCardProps {
  collection: Collection;
  itemCount: number;
  onOpen: () => void;
  onDelete: () => void;
}

export const CollectionCard = ({ collection, itemCount, onOpen, onDelete }: CollectionCardProps) => (
  <div
    className="group cursor-pointer relative"
    onClick={onOpen}
  >
    <div
      className="aspect-[3/4] rounded-lg border border-border/50 flex flex-col items-center justify-center gap-3 transition-all duration-200 group-hover:border-primary/40 group-hover:shadow-md"
      style={{ background: `${collection.color}18` }}
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-sm"
        style={{ background: collection.color + '30' }}
      >
        {collection.emoji}
      </div>
      <div className="text-center px-3">
        <p className="font-medium text-sm truncate max-w-[120px]">{collection.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{itemCount} image{itemCount !== 1 ? 's' : ''}</p>
      </div>

      {/* Delete button */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            className="absolute top-2 right-2 w-7 h-7 rounded bg-background/80 border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:border-destructive z-10"
            onClick={e => e.stopPropagation()}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete &quot;{collection.name}&quot;. The images inside will remain in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
);
