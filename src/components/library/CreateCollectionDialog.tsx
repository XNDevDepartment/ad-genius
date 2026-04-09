import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PRESET_EMOJIS = ['📁', '🎯', '⭐', '🛍️', '🌟', '📦', '🎨', '🏷️', '💼', '🚀', '🌿', '✨'];
const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
];

interface CreateCollectionDialogProps {
  onCreate: (input: { name: string; emoji: string; color: string }) => Promise<void>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CreateCollectionDialog = ({ onCreate, trigger, open, onOpenChange }: CreateCollectionDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const [color, setColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate({ name: name.trim(), emoji, color });
      setName('');
      setEmoji('📁');
      setColor('#6366f1');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Collection
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="collection-name">Name</Label>
            <Input
              id="collection-name"
              placeholder="e.g. Summer Sale 2026"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <Label>Emoji</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PRESET_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                    emoji === e ? 'ring-2 ring-primary bg-primary/10' : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <Button onClick={handleCreate} disabled={!name.trim() || saving} className="w-full">
            {saving ? 'Creating...' : 'Create Collection'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
