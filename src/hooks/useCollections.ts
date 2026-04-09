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

export function useCollections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['collections', user?.id];

  const { data: collections = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<Collection[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      if (error) throw error;
      return data as Collection;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Collection, 'name' | 'description' | 'color' | 'emoji' | 'cover_image_url'>> }) => {
      const { error } = await supabase
        .from('collections')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    collections,
    isLoading,
    createCollection: createMutation.mutateAsync,
    updateCollection: (id: string, patch: Parameters<typeof updateMutation.mutateAsync>[0]['patch']) =>
      updateMutation.mutateAsync({ id, patch }),
    deleteCollection: deleteMutation.mutateAsync,
  };
}
