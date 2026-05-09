import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CustomAudience {
  id: string;
  label: string;
  audience: string;
  used_at: string;
  created_at: string;
}

export function useCustomAudiences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['custom-audiences', user?.id];

  const { data: audiences = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<CustomAudience[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('custom_audiences' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('used_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ label, audience }: { label: string; audience: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('custom_audiences' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('audience', audience)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase
          .from('custom_audiences' as any)
          .update({ used_at: new Date().toISOString(), label } as any)
          .eq('id', (existing[0] as any).id);
      } else {
        await supabase
          .from('custom_audiences' as any)
          .insert({ user_id: user.id, label, audience } as any);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('custom_audiences' as any).delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    audiences,
    isLoading,
    saveAudience: saveMutation.mutateAsync,
    deleteAudience: deleteMutation.mutateAsync,
  };
}
