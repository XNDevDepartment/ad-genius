import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PromptHistory {
  id: string;
  prompt_template: string;
  version: number;
  change_notes: string | null;
  created_at: string;
  changed_by: string | null;
}

interface PromptHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptId: string;
  promptName: string;
}

export const PromptHistoryDialog = ({ 
  open, 
  onOpenChange, 
  promptId,
  promptName 
}: PromptHistoryDialogProps) => {
  const [history, setHistory] = useState<PromptHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && promptId) {
      fetchHistory();
    }
  }, [open, promptId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_prompt_history')
        .select('*')
        .eq('prompt_id', promptId)
        .order('version', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Version History: {promptName}</DialogTitle>
          <DialogDescription>
            View previous versions of this prompt
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No version history available
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Version {entry.version}</Badge>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    </div>

                    {entry.change_notes && (
                      <div className="bg-muted/50 p-3 rounded-md">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Change Notes:
                        </div>
                        <div className="text-sm">{entry.change_notes}</div>
                      </div>
                    )}

                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Prompt Template:
                      </div>
                      <div className="bg-muted/30 p-3 rounded-md">
                        <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                          {entry.prompt_template}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};