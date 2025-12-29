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
import { useTranslation } from 'react-i18next';

const countries = [
  'Portugal', 'Brasil', 'Espanha', 'França', 'Alemanha', 'Reino Unido', 
  'Estados Unidos', 'Canadá', 'Angola', 'Moçambique', 'Outro'
];

export const AffiliateApplicationForm = () => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [dashboardLink, setDashboardLink] = useState<string | null>(null);

  const formSchema = z.object({
    name: z.string().min(2, t('affiliate.form.validation.nameRequired')),
    email: z.string().email(t('affiliate.form.validation.emailInvalid')),
    country: z.string().min(1, t('affiliate.form.validation.countryRequired')),
    website_url: z.string().url(t('affiliate.form.validation.urlInvalid')),
    promotion_description: z.string().min(20, t('affiliate.form.validation.promotionMin')),
    audience_size: z.string().min(1, t('affiliate.form.validation.audienceRequired')),
    terms_accepted: z.boolean().refine(val => val === true, t('affiliate.form.validation.termsRequired')),
    tax_responsibility_accepted: z.boolean().refine(val => val === true, t('affiliate.form.validation.taxRequired')),
  });

  type FormValues = z.infer<typeof formSchema>;

  const audienceSizes = [
    { value: '<1k', label: t('affiliate.form.audienceOptions.small') },
    { value: '1k-10k', label: t('affiliate.form.audienceOptions.medium') },
    { value: '10k-50k', label: t('affiliate.form.audienceOptions.large') },
    { value: '50k-100k', label: t('affiliate.form.audienceOptions.xlarge') },
    { value: '100k+', label: t('affiliate.form.audienceOptions.huge') },
  ];

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
          toast.error(t('affiliate.form.errors.emailExists'));
        } else {
          throw error;
        }
        return;
      }

      setIsSuccess(true);
      setDashboardLink(`${window.location.origin}/afiliados/dashboard/${accessToken}`);
      toast.success(t('affiliate.form.successToast'));
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error(t('affiliate.form.errors.submitError'));
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
                {t('affiliate.form.successTitle')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t('affiliate.form.successMessage')}
              </p>
              {dashboardLink && (
                <div className="p-4 bg-muted rounded-xl">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('affiliate.form.saveDashboardLink')}
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
            <CardTitle className="text-2xl">{t('affiliate.form.title')}</CardTitle>
            <p className="text-muted-foreground">
              {t('affiliate.form.subtitle')}
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
                      <FormLabel>{t('affiliate.form.name')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('affiliate.form.namePlaceholder')} {...field} />
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
                      <FormLabel>{t('affiliate.form.email')}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={t('affiliate.form.emailPlaceholder')} {...field} />
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
                      <FormLabel>{t('affiliate.form.country')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('affiliate.form.countryPlaceholder')} />
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
                      <FormLabel>{t('affiliate.form.website')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('affiliate.form.websitePlaceholder')} {...field} />
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
                      <FormLabel>{t('affiliate.form.promotion')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t('affiliate.form.promotionPlaceholder')}
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
                      <FormLabel>{t('affiliate.form.audienceSize')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('affiliate.form.audiencePlaceholder')} />
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
                            {t('affiliate.form.termsAccept')}
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
                            {t('affiliate.form.taxAccept')}
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
                      {t('affiliate.form.submitting')}
                    </>
                  ) : (
                    t('affiliate.form.submit')
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
