import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  onSuccess?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const AuthModal = ({ onSuccess, isOpen, onClose }: AuthModalProps) => {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    profession: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(formData.email, formData.password, {
          name: formData.name,
          profession: formData.profession,
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Este email já está registrado. Tente fazer login.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Conta criada com sucesso! Verifique seu email.');
          onSuccess?.();
          onClose?.();
        }
      } else {
        const { error } = await signIn(formData.email, formData.password);

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Email ou senha incorretos.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Login realizado com sucesso!');
          onSuccess?.();
          onClose?.();
        }
      }
    } catch (error) {
      toast.error('Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  // If using as modal, check isOpen
  if (isOpen === false) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isSignUp ? 'Criar Conta' : 'Fazer Login'}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Crie sua conta para acessar o sistema' 
              : 'Entre com suas credenciais para continuar'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required={isSignUp}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profession">Profissão</Label>
                  <Input
                    id="profession"
                    type="text"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    placeholder="ex: Designer, Desenvolvedor, Marqueteiro"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? 'Criar Conta' : 'Entrar'}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}
            </p>
            <Button
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm"
            >
              {isSignUp ? 'Fazer Login' : 'Criar Conta'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};