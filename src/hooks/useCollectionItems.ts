import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CollectionItem {
  id: string;
  collection_id: string;
  content_id: string;
  content_type: string;
  added_at: string;
}

// Cast to any to bypass generated types that don't include collection_items table
const db = supabase as any;

export function useCollectionItems(collectionId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['collection-items', collectionId];
  const collectionsKey = ['collections', user?.id];

  const { data: items = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<CollectionItem[]> => {
      if (!collectionId) return [];
      const { data, error } = await db
        .from('collection_items')
        .select('*')
        .eq('collection_id', collectionId)
        .order('added_at', { ascending: false });
      if (error) throw error;
      return (data as CollectionItem[]) || [];
    },
    enabled: !!collectionId,
    staleTime: 30_000,
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ targetCollectionId, contentId, contentType }: { targetCollectionId: string; contentId: string; contentType: string }) => {
      const { error } = await db
        .from('collection_items')
        .upsert(
          { collection_id: targetCollectionId, content_id: contentId, content_type: contentType },
          { onConflict: 'collection_id,content_id', ignoreDuplicates: true }
        );
      if (error) throw error;
    },
    onSuccess: (_data: unknown, variables: { targetCollectionId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['collection-items', variables.targetCollectionId] });
      queryClient.invalidateQueries({ queryKey: collectionsKey });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async ({ targetCollectionId, contentId }: { targetCollectionId: string; contentId: string }) => {
      const { error } = await db
        .from('collection_items')
        .delete()
        .eq('collection_id', targetCollectionId)
        .eq('content_id', contentId);
      if (error) throw error;
    },
    onSuccess: (_data: unknown, variables: { targetCollectionId: string; contentId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['collection-items', variables.targetCollectionId] });
      queryClient.invalidateQueries({ queryKey: collectionsKey });
    },
  });

  const isInCollection = (contentId: string) =>
    items.some(item => item.content_id === contentId);

  return {
    items,
    isLoading,
    addItem: (contentId: string, contentType: string, targetCollectionId?: string) =>
      addItemMutation.mutateAsync({ targetCollectionId: targetCollectionId ?? collectionId ?? '', contentId, contentType }),
    removeItem: (contentId: string, targetCollectionId?: string) =>
      removeItemMutation.mutateAsync({ targetCollectionId: targetCollectionId ?? collectionId ?? '', contentId }),
    isInCollection,
  };
}

/** Returns the set of collection IDs that contain a given content item, across all collections. */
export function useContentCollections(contentId?: string) {
  const { user } = useAuth();

  const { data: items = [] } = useQuery({
    queryKey: ['content-collections', contentId],
    queryFn: async (): Promise<CollectionItem[]> => {
      if (!contentId) return [];
      const { data, error } = await db
        .from('collection_items')
        .select('*, collections!inner(user_id)')
        .eq('content_id', contentId)
        .eq('collections.user_id', user?.id ?? '');
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!contentId && !!user?.id,
    staleTime: 30_000,
  });

  return {
    collectionIds: new Set(items.map(i => i.collection_id)),
  };
}
