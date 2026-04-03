import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CustomScenario {
  id: string;
  title: string;
  description: string;
  used_at: string;
  created_at: string;
}

export function useCustomScenarios() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['custom-scenarios', user?.id];

  const { data: scenarios = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<CustomScenario[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('custom_scenarios' as any)
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
    mutationFn: async ({ title, description }: { title: string; description: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Check if this exact description already exists
      const { data: existing } = await supabase
        .from('custom_scenarios' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('description', description)
        .limit(1);

      if (existing && existing.length > 0) {
        // Update used_at
        await supabase
          .from('custom_scenarios' as any)
          .update({ used_at: new Date().toISOString(), title } as any)
          .eq('id', (existing[0] as any).id);
      } else {
        await supabase
          .from('custom_scenarios' as any)
          .insert({ user_id: user.id, title, description } as any);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('custom_scenarios' as any).delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    scenarios: scenarios as CustomScenario[],
    isLoading,
    saveScenario: saveMutation.mutateAsync,
    deleteScenario: deleteMutation.mutateAsync,
  };
}
