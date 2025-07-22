
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyValid, setKeyValid] = useState(false);
  const [keyValidating, setKeyValidating] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();

  // Validate access key when it changes
  useEffect(() => {
    const validateKey = async () => {
      if (!key || mode !== 'signup') {
        setKeyValid(false);
        return;
      }

      setKeyValidating(true);
      try {
        const { data, error } = await supabase.functions.invoke('validate-access-key', {
          body: { key }
        });

        if (error) {
          console.error('Key validation error:', error);
          setKeyValid(false);
        } else {
          setKeyValid(data?.valid === true);
        }
      } catch (error) {
        console.error('Key validation error:', error);
        setKeyValid(false);
      } finally {
        setKeyValidating(false);
      }
    };

    const timeoutId = setTimeout(validateKey, 500); // Debounce validation
    return () => clearTimeout(timeoutId);
  }, [key, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Login realizado com sucesso!');
          onClose();
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, {
          name,
          profession,
          access_key: key,
          account_id: `ACC${Date.now()}`,
        });
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Conta criada com sucesso! Verifique seu email para confirmar sua conta.');
          onClose();
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Email de redefinição de senha enviado! Verifique seu email.');
          setMode('login');
        }
      }
    } catch (error) {
      toast.error('Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setProfession('');
    setKey('');
    setKeyValid(false);
  };

  const toggleToSignup = () => {
    setMode('signup');
    resetForm();
  };

  const toggleToLogin = () => {
    setMode('login');
    resetForm();
  };

  const toggleToReset = () => {
    setMode('reset');
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'login' && 'Entrar'}
            {mode === 'signup' && 'Criar Conta'}
            {mode === 'reset' && 'Redefinir Senha'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={mode === 'signup'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profession">Profissão</Label>
                <Input
                  id="profession"
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="ex: Designer, Desenvolvedor, Marqueteiro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profession">Access Key</Label>
                <Input
                  id="access_key"
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  required={mode === 'signup'}
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {mode !== 'reset' && (
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading || (mode === 'signup' && (!keyValid || keyValidating))}>
            {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'login' && 'Entrar'}
            {mode === 'signup' && 'Criar Conta'}
            {mode === 'reset' && 'Enviar Email de Redefinição'}
          </Button>

          <div className="space-y-2">
            {mode === 'login' && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={toggleToSignup}
                >
                  Não tem uma conta? Registre-se
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={toggleToReset}
                >
                  Esqueceu sua senha?
                </Button>
              </>
            )}
            {mode === 'signup' && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={toggleToLogin}
              >
                Já tem uma conta? Entre
              </Button>
            )}
            {mode === 'reset' && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={toggleToLogin}
              >
                Voltar ao Login
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
