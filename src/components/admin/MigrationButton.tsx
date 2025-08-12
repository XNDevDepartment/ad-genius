import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Database } from 'lucide-react';

export const MigrationButton = () => {
  const [migrating, setMigrating] = useState(false);
  const { toast } = useToast();

  const handleMigration = async () => {
    if (!confirm('Tem certeza que deseja migrar todas as imagens para o Hetzner? Esta operação pode demorar alguns minutos.')) {
      return;
    }

    try {
      setMigrating(true);
      
      const { data, error } = await supabase.functions.invoke('migrate-to-hetzner');
      
      if (error) {
        throw error;
      }

      toast({
        title: "Migração Concluída",
        description: `${data.migratedCount} imagens migradas com sucesso. ${data.errorCount} erros.`,
      });

      console.log('Migration result:', data);
      
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: "Erro na Migração",
        description: "Falha ao migrar as imagens. Verifique os logs.",
        variant: "destructive",
      });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Button
      onClick={handleMigration}
      disabled={migrating}
      variant="outline"
      className="gap-2"
    >
      {migrating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Database className="h-4 w-4" />
      )}
      {migrating ? 'Migrando...' : 'Migrar para Hetzner'}
    </Button>
  );
};