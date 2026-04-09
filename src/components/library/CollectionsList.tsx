import { Skeleton } from '@/components/ui/skeleton';
import { CollectionCard } from './CollectionCard';
import { CreateCollectionDialog } from './CreateCollectionDialog';
import type { Collection } from '@/hooks/useCollections';

interface CollectionsListProps {
  collections: Collection[];
  isLoading: boolean;
  itemCounts: Record<string, number>;
  onOpenCollection: (id: string) => void;
  onDeleteCollection: (id: string) => void;
  onCreateCollection: (input: { name: string; emoji: string; color: string }) => Promise<void>;
}

export const CollectionsList = ({
  collections,
  isLoading,
  itemCounts,
  onOpenCollection,
  onDeleteCollection,
  onCreateCollection,
}: CollectionsListProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {collections.map(collection => (
        <CollectionCard
          key={collection.id}
          collection={collection}
          itemCount={itemCounts[collection.id] ?? 0}
          onOpen={() => onOpenCollection(collection.id)}
          onDelete={() => onDeleteCollection(collection.id)}
        />
      ))}

      {/* Create new collection card */}
      <CreateCollectionDialog
        onCreate={onCreateCollection}
        trigger={
          <div className="aspect-[3/4] rounded-lg border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground text-2xl">
              +
            </div>
            <p className="text-xs text-muted-foreground font-medium">New Collection</p>
          </div>
        }
      />
    </div>
  );
};
