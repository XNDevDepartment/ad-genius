import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  country: z.string().min(1, 'País é obrigatório'),
  website_url: z.string().url('URL inválido'),
  promotion_description: z.string().min(20, 'Descreve como pretendes promover (mínimo 20 caracteres)'),
  audience_size: z.string().min(1, 'Seleciona a dimensão da audiência'),
  terms_accepted: z.boolean().refine(val => val === true, 'Deves aceitar os termos'),
  tax_responsibility_accepted: z.boolean().refine(val => val === true, 'Deves confirmar a responsabilidade fiscal'),
});

type FormValues = z.infer<typeof formSchema>;

const countries = [
  'Portugal', 'Brasil', 'Espanha', 'França', 'Alemanha', 'Reino Unido', 
  'Estados Unidos', 'Canadá', 'Angola', 'Moçambique', 'Outro'
];

const audienceSizes = [
  { value: '<1k', label: 'Menos de 1.000' },
  { value: '1k-10k', label: '1.000 - 10.000' },
  { value: '10k-50k', label: '10.000 - 50.000' },
  { value: '50k-100k', label: '50.000 - 100.000' },
  { value: '100k+', label: 'Mais de 100.000' },
];

export const AffiliateApplicationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [dashboardLink, setDashboardLink] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      country: '',
      website_url: '',
      promotion_description: '',
      audience_size: '',
      terms_accepted: false,
      tax_responsibility_accepted: false,
    },
  });

  const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const generateAccessToken = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const referralCode = generateReferralCode();
      const accessToken = generateAccessToken();
      const referralLink = `${window.location.origin}?ref=${referralCode}`;

      const { data, error } = await supabase
        .from('affiliates')
        .insert({
          name: values.name,
          email: values.email,
          country: values.country,
          website_url: values.website_url,
          promotion_description: values.promotion_description,
          audience_size: values.audience_size,
          terms_accepted: values.terms_accepted,
          tax_responsibility_accepted: values.tax_responsibility_accepted,
          referral_code: referralCode,
          referral_link: referralLink,
          access_token: accessToken,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Este email já está registado no programa de afiliados.');
        } else {
          throw error;
        }
        return;
      }

      setIsSuccess(true);
      setDashboardLink(`${window.location.origin}/afiliados/dashboard/${accessToken}`);
      toast.success('Candidatura submetida com sucesso!');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Erro ao submeter candidatura. Tenta novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <section className="py-20" id="application-form">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto border-0 shadow-apple">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-4">
                Obrigado pela candidatura!
              </h2>
              <p className="text-muted-foreground mb-6">
                A nossa equipa irá analisar e responder em breve. Receberás um email com os próximos passos.
              </p>
              {dashboardLink && (
                <div className="p-4 bg-muted rounded-xl">
                  <p className="text-sm text-muted-foreground mb-2">
                    Guarda este link para aceder ao teu dashboard:
                  </p>
                  <code className="text-xs bg-background p-2 rounded block break-all">
                    {dashboardLink}
                  </code>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-muted/30" id="application-form">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto border-0 shadow-apple">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Candidatura ao Programa de Afiliados</CardTitle>
            <p className="text-muted-foreground">
              Preenche o formulário abaixo para te candidatares
            </p>
          </CardHeader>
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo / Nome da Empresa</FormLabel>
                      <FormControl>
                        <Input placeholder="João Silva ou Empresa Lda" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="joao@exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleciona o teu país" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website / Perfil Social</FormLabel>
                      <FormControl>
                        <Input placeholder="https://exemplo.com ou instagram.com/perfil" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="promotion_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Como pretendes promover o ProduktPix?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreve os canais e estratégias que vais utilizar..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="audience_size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dimensão estimada da audiência</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleciona a dimensão" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {audienceSizes.map((size) => (
                            <SelectItem key={size.value} value={size.value}>
                              {size.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 pt-4 border-t border-border">
                  <FormField
                    control={form.control}
                    name="terms_accepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Aceito os Termos do Programa de Afiliados
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tax_responsibility_accepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            Confirmo que sou responsável pelas minhas obrigações fiscais
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-button text-primary-foreground"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A submeter...
                    </>
                  ) : (
                    'Submeter candidatura'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
