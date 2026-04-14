import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  emoji: string;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

// Cast to any to bypass generated types that don't include collections table
const db = supabase as any;

async function ensureSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    // Try refreshing
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr || !refreshed.session) {
      throw new Error('Not authenticated. Please sign in again.');
    }
  }
}

export function useCollections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['collections', user?.id];

  const { data: collections = [], isLoading, error: queryError } = useQuery({
    queryKey,
    queryFn: async (): Promise<Collection[]> => {
      if (!user?.id) return [];
      const { data, error } = await db
        .from('collections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Collection[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (input: { name: string; emoji?: string; color?: string; description?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      await ensureSession();
      const { data, error } = await db
        .from('collections')
        .insert({
          user_id: user.id,
          name: input.name,
          emoji: input.emoji ?? '📁',
          color: input.color ?? '#6366f1',
          description: input.description ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message || 'Failed to create collection');
      return data as Collection;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Collection, 'name' | 'description' | 'color' | 'emoji' | 'cover_image_url'>> }) => {
      await ensureSession();
      const { error } = await db
        .from('collections')
        .update(patch)
        .eq('id', id);
      if (error) throw new Error(error.message || 'Failed to update collection');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await ensureSession();
      const { error } = await db
        .from('collections')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message || 'Failed to delete collection');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    collections,
    isLoading,
    queryError,
    createCollection: createMutation.mutateAsync,
    updateCollection: (id: string, patch: Parameters<typeof updateMutation.mutateAsync>[0]['patch']) =>
      updateMutation.mutateAsync({ id, patch }),
    deleteCollection: deleteMutation.mutateAsync,
  };
}
