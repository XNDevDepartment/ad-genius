import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AIPrompt {
  id: string;
  prompt_key: string;
  prompt_name: string;
  prompt_template: string;
  prompt_type: string;
  description: string | null;
  variables: string[];
  is_active: boolean;
  category: string;
  version: number;
}

interface PromptEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: AIPrompt;
  onSave: () => void;
}

export const PromptEditorDialog = ({ open, onOpenChange, prompt, onSave }: PromptEditorDialogProps) => {
  const [editedTemplate, setEditedTemplate] = useState('');
  const [changeNotes, setChangeNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (prompt) {
      setEditedTemplate(prompt.prompt_template);
      setCharCount(prompt.prompt_template.length);
      setChangeNotes('');
    }
  }, [prompt]);

  const handleTemplateChange = (value: string) => {
    setEditedTemplate(value);
    setCharCount(value.length);
  };

  const detectVariables = (template: string): string[] => {
    const regex = /\{([^}]+)\}/g;
    const matches = [...template.matchAll(regex)];
    return Array.from(new Set(matches.map(m => m[1])));
  };

  const handleSave = async () => {
    if (!changeNotes.trim()) {
      toast({
        title: "Change notes required",
        description: "Please provide notes about what changed",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const detectedVariables = detectVariables(editedTemplate);
      const newVersion = prompt.version + 1;

      // Update the prompt
      const { error: updateError } = await supabase
        .from('ai_prompts')
        .update({
          prompt_template: editedTemplate,
          variables: detectedVariables,
          version: newVersion,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', prompt.id);

      if (updateError) throw updateError;

      // Create history entry
      const { error: historyError } = await supabase
        .from('ai_prompt_history')
        .insert({
          prompt_id: prompt.id,
          prompt_template: prompt.prompt_template, // Save the OLD template
          version: prompt.version, // OLD version
          changed_by: user?.id,
          change_notes: changeNotes
        });

      if (historyError) throw historyError;

      toast({
        title: "Success",
        description: `Prompt updated to v${newVersion}. Changes are now live!`
      });

      onSave();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: "Error",
        description: "Failed to save prompt changes",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = editedTemplate !== prompt.prompt_template;
  const detectedVars = detectVariables(editedTemplate);
  const missingVars = prompt.variables.filter(v => !detectedVars.includes(v));
  const newVars = detectedVars.filter(v => !prompt.variables.includes(v));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Prompt: {prompt.prompt_name}</DialogTitle>
          <DialogDescription>
            Edit the prompt template. Changes take effect immediately when deployed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Prompt Key</Label>
              <div className="font-mono text-sm">{prompt.prompt_key}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <div className="text-sm">{prompt.category.replace('_', ' ')}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Badge variant="outline">{prompt.prompt_type}</Badge>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Current Version</Label>
              <div className="text-sm">v{prompt.version}</div>
            </div>
          </div>

          {prompt.description && (
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <div className="text-sm text-muted-foreground">{prompt.description}</div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Prompt Template</Label>
              <span className="text-xs text-muted-foreground">
                {charCount.toLocaleString()} characters
              </span>
            </div>
            <Textarea
              value={editedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="font-mono text-sm min-h-[400px]"
              placeholder="Enter your prompt template here..."
            />
          </div>

          {(newVars.length > 0 || missingVars.length > 0) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  {newVars.length > 0 && (
                    <div>
                      <strong>New variables detected:</strong>{' '}
                      {newVars.map(v => (
                        <code key={v} className="bg-muted px-1 py-0.5 rounded text-xs ml-1">
                          {`{${v}}`}
                        </code>
                      ))}
                    </div>
                  )}
                  {missingVars.length > 0 && (
                    <div className="text-destructive">
                      <strong>Variables removed:</strong>{' '}
                      {missingVars.map(v => (
                        <code key={v} className="bg-destructive/10 px-1 py-0.5 rounded text-xs ml-1">
                          {`{${v}}`}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="change-notes">Change Notes *</Label>
            <Input
              id="change-notes"
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              placeholder="Describe what you changed and why..."
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving || !changeNotes.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Deploy Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};