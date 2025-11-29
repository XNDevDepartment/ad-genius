import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PromoCode {
  id: string;
  code: string;
  credits_amount: number;
  description: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PromoCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promoCode: PromoCode | null;
  isCreating: boolean;
  onSave: () => void;
}

export const PromoCodeDialog = ({ open, onOpenChange, promoCode, isCreating, onSave }: PromoCodeDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [creditsAmount, setCreditsAmount] = useState('');
  const [description, setDescription] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [isActive, setIsActive] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (promoCode && !isCreating) {
      setCode(promoCode.code);
      setCreditsAmount(promoCode.credits_amount.toString());
      setDescription(promoCode.description || '');
      setMaxUses(promoCode.max_uses?.toString() || '');
      setExpiresAt(promoCode.expires_at ? new Date(promoCode.expires_at) : undefined);
      setIsActive(promoCode.is_active);
    } else {
      // Reset form for creating new code
      setCode('');
      setCreditsAmount('');
      setDescription('');
      setMaxUses('');
      setExpiresAt(undefined);
      setIsActive(true);
    }
  }, [promoCode, isCreating, open]);

  const validateForm = () => {
    if (!code.trim()) {
      toast({
        title: "Validation Error",
        description: "Code is required",
        variant: "destructive"
      });
      return false;
    }

    if (!/^[A-Z0-9]+$/.test(code)) {
      toast({
        title: "Validation Error",
        description: "Code must contain only uppercase letters and numbers",
        variant: "destructive"
      });
      return false;
    }

    const credits = parseInt(creditsAmount);
    if (!creditsAmount || isNaN(credits) || credits < 1) {
      toast({
        title: "Validation Error",
        description: "Credits amount must be a positive number",
        variant: "destructive"
      });
      return false;
    }

    if (maxUses && (isNaN(parseInt(maxUses)) || parseInt(maxUses) < 1)) {
      toast({
        title: "Validation Error",
        description: "Max uses must be a positive number or empty for unlimited",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data = {
        code: code.toUpperCase(),
        credits_amount: parseInt(creditsAmount),
        description: description.trim() || null,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        is_active: isActive
      };

      if (isCreating) {
        const { error } = await supabase
          .from('promo_codes')
          .insert(data);

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            throw new Error('A promo code with this code already exists');
          }
          throw error;
        }

        toast({
          title: "Success",
          description: "Promo code created successfully"
        });
      } else if (promoCode) {
        const { error } = await supabase
          .from('promo_codes')
          .update(data)
          .eq('id', promoCode.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Promo code updated successfully"
        });
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving promo code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save promo code",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? 'Create New Promo Code' : 'Edit Promo Code'}
          </DialogTitle>
          <DialogDescription>
            {isCreating 
              ? 'Create a new promotion code with custom credits and usage limits'
              : 'Update the promo code settings'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="NEWCODE2024"
              disabled={!isCreating || loading}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Uppercase letters and numbers only
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="credits">Credits Amount *</Label>
            <Input
              id="credits"
              type="number"
              min="1"
              value={creditsAmount}
              onChange={(e) => setCreditsAmount(e.target.value)}
              placeholder="80"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Marketing campaign Q1 2025"
              disabled={loading}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxUses">Max Uses</Label>
            <Input
              id="maxUses"
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Leave empty for unlimited"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for unlimited uses
            </p>
          </div>

          <div className="space-y-2">
            <Label>Expiry Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expiresAt && "text-muted-foreground"
                  )}
                  disabled={loading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? format(expiresAt, "PPP") : "No expiry date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={setExpiresAt}
                  initialFocus
                  disabled={(date) => date < new Date()}
                  className={cn("p-3 pointer-events-auto")}
                />
                {expiresAt && (
                  <div className="p-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpiresAt(undefined)}
                      className="w-full"
                    >
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Leave empty for codes that never expire
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active</Label>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isCreating ? 'Create Code' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
